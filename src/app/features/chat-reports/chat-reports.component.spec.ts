import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ChatReportService } from '../../core/services/chat-report.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ChatReport, ChatReportGroup, ChatReportSummary } from '../../core/models/chat-report.model';
import { ChatReportsComponent } from './chat-reports.component';

const NOW = new Date().toISOString();

function report(overrides: Partial<ChatReport> = {}): ChatReport {
  return {
    id: 1,
    reporterUsername: 'bob',
    reason: 'HARASSMENT',
    note: null,
    status: 'OPEN',
    reportedAt: NOW,
    resolvedAt: null,
    resolvedBy: null,
    ...overrides,
  };
}

function group(overrides: Partial<ChatReportGroup> = {}): ChatReportGroup {
  return {
    channel: 'COMMUNITY',
    messageId: 10,
    senderUsername: 'alice',
    recipientUsername: null,
    content: 'you lift like a toddler',
    kind: 'TEXT',
    media: null,
    sentAt: NOW,
    deletedBySender: false,
    removedByStaff: false,
    messageAvailable: true,
    openCount: 1,
    latestReportedAt: NOW,
    reports: [report()],
    ...overrides,
  };
}

/** A community text report, and a DM GIF the sender has since deleted, reported twice. */
function groups(): ChatReportGroup[] {
  return [
    group(),
    group({
      channel: 'DM',
      messageId: 20,
      senderUsername: 'carl',
      recipientUsername: 'dana',
      content: '',
      kind: 'GIF',
      media: { url: 'https://static.klipy.com/rude.webp', previewUrl: null, width: 200, height: 100 },
      deletedBySender: true,
      openCount: 2,
      reports: [
        report({ id: 3, reporterUsername: 'dana', reason: 'INAPPROPRIATE', note: 'not ok' }),
        report({ id: 2, reporterUsername: 'erin', reason: 'SPAM' }),
      ],
    }),
  ];
}

describe('ChatReportsComponent', () => {
  let fixture: ComponentFixture<ChatReportsComponent>;
  let service: jasmine.SpyObj<ChatReportService>;
  let summary: WritableSignal<ChatReportSummary | null>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let confirmNext: boolean;

  beforeEach(async () => {
    confirmNext = true;
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(
      () => ({ afterClosed: () => of(confirmNext) }) as unknown as MatDialogRef<ConfirmDialogComponent>,
    );
    summary = signal<ChatReportSummary | null>(null);
    service = jasmine.createSpyObj<ChatReportService>(
      'ChatReportService',
      ['getGrouped', 'loadSummary', 'dismiss', 'remove'],
      { summary },
    );
    service.getGrouped.and.callFake(() => of(groups()));
    service.loadSummary.and.callFake(() => {
      summary.set({ openMessages: 2, openReports: 3 });
      return of({ openMessages: 2, openReports: 3 });
    });
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ChatReportsComponent],
      providers: [provideNoopAnimations(), { provide: ChatReportService, useValue: service }],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(ChatReportsComponent);
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const card = (key: string): HTMLElement => el().querySelector(`[data-testid="report-${key}"]`) as HTMLElement;
  const text = (root: ParentNode, selector: string): string =>
    root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const click = (root: ParentNode, selector: string) => (root.querySelector(selector) as HTMLButtonElement).click();

  it('loads open reports and the counts', () => {
    render();

    expect(service.getGrouped).toHaveBeenCalledOnceWith(false);
    expect(text(el(), '[data-testid="stat-messages"]')).toBe('2');
    expect(text(el(), '[data-testid="stat-reports"]')).toBe('3');
    expect(el().querySelectorAll('mat-card[data-testid^="report-"]').length).toBe(2);
  });

  it('shows who said what, where, and every report on it', () => {
    render();

    const community = card('COMMUNITY-10');
    expect(community.textContent).toContain('Community chat');
    expect(text(community, '[data-testid="who"]')).toBe('From alice');
    expect(text(community, '[data-testid="message"]')).toBe('you lift like a toddler');
    expect(text(community, '[data-testid="open-count"]')).toBe('1 open report');
    const row = text(community, '[data-testid="report-row"]');
    expect(row).toContain('Harassment or bullying');
    expect(row).toContain('by bob');

    const dm = card('DM-20');
    expect(dm.textContent).toContain('Direct message');
    expect(text(dm, '[data-testid="who"]')).toBe('From carl to dana');
    expect(dm.querySelector('[data-testid="deleted-tag"]')).not.toBeNull();
    const img = dm.querySelector('[data-testid="message-media"]') as HTMLImageElement;
    expect(img.src).toBe('https://static.klipy.com/rude.webp');
    expect(img.alt).toBe('GIF from carl');
    const rows = dm.querySelectorAll('[data-testid="report-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Inappropriate content');
    expect(rows[0].textContent).toContain('"not ok"');
  });

  it('removes a message after confirming, and drops it from the open list', () => {
    service.remove.and.returnValue(of(group({ removedByStaff: true, openCount: 0, reports: [report({ status: 'ACTIONED' })] })));
    render();

    click(card('COMMUNITY-10'), '[data-testid="remove"]');
    fixture.detectChanges();

    const data = dialog.open.calls.mostRecent().args[1]?.data as ConfirmDialogData;
    expect(data.danger).toBeTrue();
    expect(data.message).toContain("alice's message");
    expect(service.remove).toHaveBeenCalledOnceWith('COMMUNITY', 10);
    expect(card('COMMUNITY-10')).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Message removed', 'OK', { duration: 3000 });
    // Counts refreshed after the change
    expect(service.loadSummary).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the removal is cancelled', () => {
    confirmNext = false;
    render();
    click(card('COMMUNITY-10'), '[data-testid="remove"]');
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('dismisses reports without asking', () => {
    service.dismiss.and.returnValue(of(group({ openCount: 0, reports: [report({ status: 'DISMISSED' })] })));
    render();

    click(card('DM-20'), '[data-testid="dismiss"]');
    fixture.detectChanges();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(service.dismiss).toHaveBeenCalledOnceWith('DM', 20);
    expect(card('DM-20')).toBeNull();
  });

  it('keeps resolved messages in place when showing resolved', () => {
    render();
    fixture.componentInstance.showResolved = true;
    fixture.componentInstance.loadAll();
    expect(service.getGrouped).toHaveBeenCalledWith(true);

    service.dismiss.and.returnValue(of(group({
      openCount: 0,
      reports: [report({ status: 'DISMISSED', resolvedBy: 'staff1' })],
    })));
    click(card('COMMUNITY-10'), '[data-testid="dismiss"]');
    fixture.detectChanges();

    const resolved = card('COMMUNITY-10');
    expect(text(resolved, '[data-testid="open-count"]')).toBe('Resolved');
    expect(text(resolved, '[data-testid="report-row"]')).toContain('Dismissed by staff1');
    expect(resolved.querySelector('[data-testid="dismiss"]')).toBeNull();
  });

  it('reloads when another admin already handled the message', () => {
    service.dismiss.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    render();
    click(card('COMMUNITY-10'), '[data-testid="dismiss"]');

    expect(snackBar.open).toHaveBeenCalledWith('Another admin already handled this message', 'Dismiss', { duration: 4000 });
    expect(service.getGrouped).toHaveBeenCalledTimes(2);
  });

  it('says when an update fails for another reason', () => {
    service.remove.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    render();
    click(card('COMMUNITY-10'), '[data-testid="remove"]');
    expect(snackBar.open).toHaveBeenCalledWith('Failed to update the report', 'Dismiss', { duration: 3000 });
    expect(card('COMMUNITY-10')).not.toBeNull();
  });

  it('shows a message that no longer exists without a Remove button', () => {
    service.getGrouped.and.returnValue(of([group({
      messageAvailable: false, senderUsername: null, content: null, kind: null, sentAt: null,
    })]));
    render();
    const missing = card('COMMUNITY-10');
    expect(text(missing, '[data-testid="message"]')).toBe('This message no longer exists.');
    expect(missing.querySelector('[data-testid="remove"]')).toBeNull();
    expect(missing.querySelector('[data-testid="dismiss"]')).not.toBeNull();
  });

  it('says when there is nothing to review', () => {
    service.getGrouped.and.returnValue(of([]));
    render();
    expect(text(el(), '[data-testid="empty"]')).toContain('No reported messages');
  });

  it('tells the admin when the list fails to load', () => {
    service.getGrouped.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    render();
    expect(snackBar.open).toHaveBeenCalledWith('Failed to load reported messages', 'Dismiss', { duration: 3000 });
  });
});
