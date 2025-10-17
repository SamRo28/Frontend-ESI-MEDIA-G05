import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisuDashboard } from './visu-dashboard';

describe('VisuDashboard', () => {
  let component: VisuDashboard;
  let fixture: ComponentFixture<VisuDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisuDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisuDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
