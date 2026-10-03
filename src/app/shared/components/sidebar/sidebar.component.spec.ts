import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EquipmentIssueService } from '../../../core/services/equipment-issue.service';
import { EquipmentIssueSummary } from '../../../core/models/equipment-issue.model';
import { ISSUE_BADGE_REFRESH_MS, SidebarComponent } from './sidebar.component';

const SUMMARY: EquipmentIssueSummary = { reported: 3, acknowledged: 0, inProgress: 0, affectedMachines: 2 };

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let service: jasmine.SpyObj<EquipmentIssueService>;
  let summary: WritableSignal<EquipmentIssueSummary | null>;

  beforeEach(async () => {
    summary = signal<EquipmentIssueSummary | null>(null);
    service = jasmine.createSpyObj<EquipmentIssueService>('EquipmentIssueService', ['loadSummary'], { summary });
    service.loadSummary.and.returnValue(of(SUMMARY));

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), { provide: EquipmentIssueService, useValue: service }],
    }).compileComponents();
  });

  const badge = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('[data-testid="issues-badge"]');

  it('links to the Equipment Issues page', () => {
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    const issuesLink = links.find((a) => a.textContent?.includes('Equipment Issues'));
    expect(issuesLink?.getAttribute('href')).toBe('/equipment-issues');
  });

  it('badges the number of reports awaiting review', () => {
    fixture = TestBed.createComponent(SidebarComponent);
    summary.set(SUMMARY);
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('3');
  });

  it('hides the badge when nothing is awaiting review', () => {
    fixture = TestBed.createComponent(SidebarComponent);
    summary.set({ ...SUMMARY, reported: 0 });
    fixture.detectChanges();

    expect(badge()).toBeNull();
  });

  it('polls the counts every minute and keeps polling after a failure', fakeAsync(() => {
    service.loadSummary.and.returnValues(throwError(() => new Error('offline')), of(SUMMARY), of(SUMMARY));
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    expect(service.loadSummary).toHaveBeenCalledTimes(1);

    tick(ISSUE_BADGE_REFRESH_MS);
    expect(service.loadSummary).toHaveBeenCalledTimes(2);

    tick(ISSUE_BADGE_REFRESH_MS);
    expect(service.loadSummary).toHaveBeenCalledTimes(3);

    fixture.destroy();
  }));
});
