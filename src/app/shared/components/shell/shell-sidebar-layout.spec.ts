import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AuthService } from '../../../core/services/auth.service';
import { EquipmentIssueService } from '../../../core/services/equipment-issue.service';
import { EquipmentIssueStore } from '../../../core/services/equipment-issue-store.service';
import { HelpRequestStore } from '../../../core/services/help-request-store.service';
import { EquipmentIssueSummary } from '../../../core/models/equipment-issue.model';
import { ShellComponent } from './shell.component';

/**
 * Measures the real layout in Chrome: Karma loads the same global styles as the app (Material theme and
 * Tailwind, see angular.json), so these sizes match the dashboard.
 */
describe('ShellComponent sidebar layout', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let summary: WritableSignal<EquipmentIssueSummary | null>;
  let needsStaffCount: WritableSignal<number>;

  const awaitingReview = (reported: number): EquipmentIssueSummary => ({
    reported, acknowledged: 0, inProgress: 0, affectedMachines: reported > 0 ? 1 : 0, outOfOrderMachines: 0,
  });

  beforeEach(async () => {
    summary = signal<EquipmentIssueSummary | null>(awaitingReview(0));
    needsStaffCount = signal(0);

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: EquipmentIssueStore, useValue: jasmine.createSpyObj('EquipmentIssueStore', ['start', 'stop']) },
        {
          provide: HelpRequestStore,
          useValue: jasmine.createSpyObj('HelpRequestStore', ['start', 'stop'], { needsStaffCount }),
        },
        { provide: EquipmentIssueService, useValue: { summary } },
        { provide: AuthService, useValue: { getUsername: () => 'admin', getEmail: () => '', logout: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    await settle();
  });

  /** Renders, then gives the sidenav container a frame to measure the open sidebar and place the page beside it. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    fixture.detectChanges();
  }

  async function setAwaitingReview(reported: number): Promise<void> {
    summary.set(awaitingReview(reported));
    await settle();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const sidebar = (): DOMRect => el().querySelector('mat-sidenav')!.getBoundingClientRect();
  const page = (): DOMRect => el().querySelector('mat-sidenav-content')!.getBoundingClientRect();
  const badge = (): HTMLElement | null => el().querySelector('[data-testid="issues-badge"]');
  const helpBadge = (): HTMLElement | null => el().querySelector('[data-testid="help-badge"]');
  /** A link's clipped text area (it ends in "…" when the label doesn't fit). */
  const label = (text: string): HTMLElement =>
    Array.from(el().querySelectorAll<HTMLElement>('app-sidebar .mdc-list-item__content'))
      .find((content) => content.textContent?.includes(text))!;
  const issuesLabel = (): HTMLElement => label('Equipment Issues');

  async function setNeedsStaff(count: number): Promise<void> {
    needsStaffCount.set(count);
    await settle();
  }

  it('keeps its width when the first report comes in, so it never covers the page', async () => {
    const width = sidebar().width;
    expect(badge()).toBeNull();
    expect(sidebar().right).toBeLessThanOrEqual(page().left);

    await setAwaitingReview(1);
    expect(badge()).not.toBeNull();
    expect(sidebar().width).toBe(width);
    expect(sidebar().right).toBeLessThanOrEqual(page().left);

    await setAwaitingReview(12);
    expect(sidebar().width).toBe(width);
    expect(sidebar().right).toBeLessThanOrEqual(page().left);

    // The help request badge too
    await setNeedsStaff(1);
    expect(helpBadge()).not.toBeNull();
    expect(sidebar().width).toBe(width);
    expect(sidebar().right).toBeLessThanOrEqual(page().left);
  });

  it('shows "Equipment Issues" in full next to the badge', async () => {
    for (const reported of [1, 12, 123]) {
      await setAwaitingReview(reported);

      expect(badge()?.textContent?.trim()).toBe(String(reported));
      expect(issuesLabel().scrollWidth)
        .withContext(`label cut off next to a badge of ${reported}`)
        .toBeLessThanOrEqual(issuesLabel().clientWidth);
    }
  });

  it('shows "Help Requests" in full next to its badge', async () => {
    for (const waiting of [1, 12, 123]) {
      await setNeedsStaff(waiting);

      expect(helpBadge()?.textContent?.trim()).toBe(String(waiting));
      expect(label('Help Requests').scrollWidth)
        .withContext(`label cut off next to a badge of ${waiting}`)
        .toBeLessThanOrEqual(label('Help Requests').clientWidth);
    }
  });
});
