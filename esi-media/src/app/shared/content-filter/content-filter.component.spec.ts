import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentFilterComponent } from './content-filter.component';

describe('ContentFilterComponent', () => {
  let component: ContentFilterComponent;
  let fixture: ComponentFixture<ContentFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filters when applyFilters is called', () => {
    spyOn(component.filtersApplied, 'emit');
    component.selectedTags = ['pop', 'rock'];
    
    component.applyFilters();
    
    expect(component.filtersApplied.emit).toHaveBeenCalledWith(['pop', 'rock']);
    expect(component.showFilterPanel).toBeFalse();
  });

  it('should toggle tag selection correctly', () => {
    // Seleccionar tag
    component.toggleTag('pop');
    expect(component.selectedTags).toContain('pop');
    expect(component.isTagSelected('pop')).toBeTrue();
    
    // Deseleccionar tag
    component.toggleTag('pop');
    expect(component.selectedTags).not.toContain('pop');
    expect(component.isTagSelected('pop')).toBeFalse();
  });

  it('should clear all filters', () => {
    component.selectedTags = ['pop', 'rock', 'jazz'];
    
    component.clearFilters();
    
    expect(component.selectedTags).toEqual([]);
    expect(component.selectedCount).toBe(0);
  });

  it('should return correct available tags for video content', () => {
    component.contentType = 'video';
    
    const tags = component.availableTags;
    
    expect(tags.some(tag => tag.value === 'cocina')).toBeTrue();
    expect(tags.some(tag => tag.value === 'pop')).toBeFalse(); // audio tag should not be present
  });

  it('should return correct available tags for audio content', () => {
    component.contentType = 'audio';
    
    const tags = component.availableTags;
    
    expect(tags.some(tag => tag.value === 'pop')).toBeTrue();
    expect(tags.some(tag => tag.value === 'cocina')).toBeFalse(); // video tag should not be present
  });

  it('should return combined tags for all content', () => {
    component.contentType = 'all';
    
    const tags = component.availableTags;
    
    expect(tags.some(tag => tag.value === 'cocina')).toBeTrue(); // video tag
    expect(tags.some(tag => tag.value === 'pop')).toBeTrue(); // audio tag
  });

  it('should generate correct selected tags text', () => {
    component.contentType = 'all';
    component.selectedTags = ['pop', 'cocina'];
    
    const text = component.getSelectedTagsText();
    
    expect(text).toBe('Pop, Cocina');
  });

  it('should return empty string when no tags selected', () => {
    component.selectedTags = [];
    
    const text = component.getSelectedTagsText();
    
    expect(text).toBe('');
  });
});