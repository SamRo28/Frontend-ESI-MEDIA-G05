import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fa2Qr } from './fa2-qr';

describe('Fa2Qr', () => {
  let component: Fa2Qr;
  let fixture: ComponentFixture<Fa2Qr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fa2Qr]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fa2Qr);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
