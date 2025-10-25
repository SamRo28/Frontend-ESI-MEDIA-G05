import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentList } from './content-list';

describe('ContentList', () => {
  let component: ContentList;
  let fixture: ComponentFixture<ContentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
