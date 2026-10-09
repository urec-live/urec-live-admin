import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AuthService } from '../../../core/services/auth.service';
import { EquipmentIssueService } from '../../../core/services/equipment-issue.service';
import { EquipmentIssueStore } from '../../../core/services/equipment-issue-store.service';
import { EquipmentIssueSummary } from '../../../core/models/equipment-issue.model';
import { ShellComponent } from './shell.component';

/**
 * Measures the real layout in Chrome: Karma loads the same global styles as the app (Material theme and
 * Tailwind, see angular.json), so these sizes match the dashboard.
 */
describe('ShellComponent sidebar layout', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let summary: WritableSignal<EquipmentIssueSummary | null>;

  const awaitingReview = (reported: number): EquipmentIssueSummary => ({
    reported, acknowledged: 0, inProgress: 0, affectedMachines: reported > 0 ? 1 : 0, outOfOrderMachines: 0,
  });

  beforeEach(async () => {
    summary = signal<EquipmentIssueSummary | null>(awaitingReview(0));

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: EquipmentIssueStore, useValue: jasmine.createSpyObj('EquipmentIssueStore', ['start', 'stop']) },
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
  /** The clipped text area of the Equipment Issues link (it ends in "…" when the label doesn't fit). */
  const issuesLabel = (): HTMLElement =>
    Array.from(el().querySelectorAll<HTMLElement>('app-sidebar .mdc-list-item__content'))
      .find((content) => content.textContent?.includes('Equipment Issues'))!;

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
});
