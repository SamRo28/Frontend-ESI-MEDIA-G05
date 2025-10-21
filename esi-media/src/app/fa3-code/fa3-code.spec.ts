import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fa3Code } from './fa3-code';

describe('Fa3Code', () => {
  let component: Fa3Code;
  let fixture: ComponentFixture<Fa3Code>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fa3Code]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fa3Code);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
