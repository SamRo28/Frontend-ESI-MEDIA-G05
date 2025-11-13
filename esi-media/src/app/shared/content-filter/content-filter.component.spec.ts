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
    component.activeContentType = 'audio';
    component.selectedTagsAudio = ['pop', 'rock'];
    
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
    component.selectedTagsAudio = ['pop', 'rock'];
    component.selectedTagsVideo = ['cocina'];
    component.selectedSuscripcion = 'VIP';
    component.selectedEdad = '18';
    component.selectedResolution = '1080p';
    
    component.clearFilters();
    
    expect(component.selectedTagsAudio).toEqual([]);
    expect(component.selectedTagsVideo).toEqual([]);
    expect(component.selectedSuscripcion).toBe('ANY');
    expect(component.selectedEdad).toBeNull();
    expect(component.selectedResolution).toBeNull();
    expect(component.selectedCount).toBe(0);
  });

  it('should return correct available tags for video content', () => {
    component.activeContentType = 'video';

    const tags = component.availableTags;
    
    expect(tags.some(tag => tag.value === 'cocina')).toBeTrue();
    expect(tags.some(tag => tag.value === 'pop')).toBeFalse(); // audio tag should not be present
  });

  it('should return correct available tags for audio content', () => {
    component.activeContentType = 'audio';

    const tags = component.availableTags;
    
    expect(tags.some(tag => tag.value === 'pop')).toBeTrue();
    expect(tags.some(tag => tag.value === 'cocina')).toBeFalse(); // video tag should not be present
  });

  it('should return combined tags for all content', () => {
    component.activeContentType = 'all';

    const tags = component.availableTags;
    
    expect(tags.some(tag => tag.value === 'cocina')).toBeTrue(); // video tag
    expect(tags.some(tag => tag.value === 'pop')).toBeTrue(); // audio tag
  });

  it('should generate correct selected tags text', () => {
    component.activeContentType = 'audio';
    component.selectedTagsAudio = ['pop', 'rock'];

    const text = component.getSelectedTagsText();

    expect(text).toBe('Pop, Rock');
  });

  it('should return empty string when no tags selected', () => {
    component.activeContentType = 'video';
    component.selectedTagsVideo = [];

    const text = component.getSelectedTagsText();

    expect(text).toBe('');
  });
});