import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { EquipmentIssueService } from '../../../core/services/equipment-issue.service';
import { EquipmentIssueSummary } from '../../../core/models/equipment-issue.model';
import { SidebarComponent } from './sidebar.component';

const SUMMARY: EquipmentIssueSummary = {
  reported: 3, acknowledged: 0, inProgress: 0, affectedMachines: 2, outOfOrderMachines: 0,
};

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let summary: WritableSignal<EquipmentIssueSummary | null>;

  beforeEach(async () => {
    // EquipmentIssueStore keeps this signal current; the sidebar only reads it
    summary = signal<EquipmentIssueSummary | null>(null);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), { provide: EquipmentIssueService, useValue: { summary } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
  });

  const badge = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('[data-testid="issues-badge"]');

  it('links to the Equipment Issues page', () => {
    fixture.detectChanges();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    const issuesLink = links.find((a) => a.textContent?.includes('Equipment Issues'));
    expect(issuesLink?.getAttribute('href')).toBe('/equipment-issues');
  });

  it('badges the number of reports awaiting review', () => {
    summary.set(SUMMARY);
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('3');
  });

  it('hides the badge when nothing is awaiting review', () => {
    summary.set({ ...SUMMARY, reported: 0 });
    fixture.detectChanges();

    expect(badge()).toBeNull();
  });

  it('updates the badge as soon as the counts change, without polling itself', () => {
    summary.set(SUMMARY);
    fixture.detectChanges();
    summary.set({ ...SUMMARY, reported: 4 });
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('4');
  });
});
