import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sync from '../Sync';
import { db } from '../../../db/db';

global.fetch = vi.fn();

describe('Sync Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.outbox.clear();
    await db.patients.clear();
    await db.observations.clear();
    await db.documents.clear();
    await db.symptoms.clear();
    await db.appointments.clear();

    // Default fetch mock
    (global.fetch as any).mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ id: 'backend-patient-id' }),
    });
  });

  it('renders sync page with empty outbox status', async () => {
    render(
      <MemoryRouter>
        <Sync />
      </MemoryRouter>
    );

    expect(screen.getByText(/ready_to_sync/i)).toBeInTheDocument();
    expect(screen.getByText(/Outbox is completely empty/i)).toBeInTheDocument();
  });

  it('renders outbox queue list when items are pending', async () => {
    await db.outbox.add({
      operation_id: 'op-1',
      entity_type: 'patients',
      entity_id: 'patient-1',
      action: 'CREATE',
      payload: { id: 'patient-1', full_name: 'Gurbaksh Singh', phone: '9999999999' },
      created_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <Sync />
      </MemoryRouter>
    );

    expect(await screen.findByText('Gurbaksh Singh')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  it('synchronizes multiple offline entity types successfully', async () => {
    // 1. Seed Patient in Outbox
    await db.outbox.add({
      operation_id: 'op-patient',
      entity_type: 'patients',
      entity_id: 'patient-1',
      action: 'CREATE',
      payload: { id: 'patient-1', full_name: 'Gurbaksh Singh', phone: '9999999999' },
      created_at: new Date().toISOString(),
    });

    // 2. Seed Observation in Outbox
    await db.outbox.add({
      operation_id: 'op-obs',
      entity_type: 'observation',
      entity_id: 'obs-1',
      action: 'CREATE',
      payload: { patient_id: 'patient-1', code: '8310-5', value_string: '98.6', unit: 'F' },
      created_at: new Date().toISOString(),
    });

    // 3. Seed Document Reference in Outbox
    await db.outbox.add({
      operation_id: 'op-doc',
      entity_type: 'document_reference',
      entity_id: 'doc-1',
      action: 'CREATE',
      payload: { patient_id: 'patient-1', file_name: 'report.pdf', content_type: 'application/pdf', document_type: 'report' },
      created_at: new Date().toISOString(),
    });

    // Seed local document base64 data
    await db.documents.put({
      id: 'doc-1',
      patient_id: 'patient-1',
      file_name: 'report.pdf',
      content_type: 'application/pdf',
      base64_data: 'data:application/pdf;base64,ZHVtbXk=',
      document_type: 'report',
      created_at: new Date().toISOString(),
    });

    // 4. Seed Appointment in Outbox
    await db.outbox.add({
      operation_id: 'op-appt',
      entity_type: 'appointment',
      entity_id: 'appt-1',
      action: 'CREATE',
      payload: { patient_id: 'patient-1', practitioner_id: 'doc-1', scheduled_for: '2026-06-01T10:00', chief_complaint: 'Fever' },
      created_at: new Date().toISOString(),
    });

    // Seed local symptom intake to be nested inside appointment sync
    await db.symptoms.put({
      id: 'sym-1',
      patient_id: 'patient-1',
      appointment_id: '',
      symptoms: ['Fever'],
      raw_text: 'Fever notes',
      created_at: new Date().toISOString(),
    });

    // Custom fetch mock to collect requests
    const fetchedUrls: string[] = [];
    (global.fetch as any).mockImplementation((url: string) => {
      fetchedUrls.push(url);
      return Promise.resolve({
        ok: true,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ id: 'success-id' }),
      });
    });

    render(
      <MemoryRouter>
        <Sync />
      </MemoryRouter>
    );

    // Wait for the queue to render
    expect(await screen.findByText('Gurbaksh Singh')).toBeInTheDocument();

    const syncBtn = screen.getByRole('button', { name: /Push 4 Changes Online/i });
    fireEvent.click(syncBtn);

    // Wait for sync to complete and clear queue
    await waitFor(async () => {
      const outboxItems = await db.outbox.toArray();
      expect(outboxItems.length).toBe(0);
    });

    // Verify correct endpoints were hit
    expect(fetchedUrls.some(u => u.includes('/patients/'))).toBe(true);
    expect(fetchedUrls.some(u => u.includes('/clinical/observations'))).toBe(true);
    expect(fetchedUrls.some(u => u.includes('/clinical/documents'))).toBe(true);
    expect(fetchedUrls.some(u => u.includes('/appointments/'))).toBe(true);

    // Verify base64 data was cleared from Dexie documents table
    const storedDoc = await db.documents.get('doc-1');
    expect(storedDoc?.base64_data).toBe('');
  });
});
