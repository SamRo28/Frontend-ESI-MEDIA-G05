import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fa2Code } from './fa2-code';

describe('Fa2Code', () => {
  let component: Fa2Code;
  let fixture: ComponentFixture<Fa2Code>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fa2Code]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fa2Code);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
