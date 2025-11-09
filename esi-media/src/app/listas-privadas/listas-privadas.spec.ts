import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListasPrivadas } from './listas-privadas';

describe('ListasPrivadas', () => {
  let component: ListasPrivadas;
  let fixture: ComponentFixture<ListasPrivadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListasPrivadas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListasPrivadas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
