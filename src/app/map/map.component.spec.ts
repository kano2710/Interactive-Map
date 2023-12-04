import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import View from 'ol/View';
import Draw from 'ol/interaction/Draw';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(waitForAsync(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the map', () => {
    spyOn(component, 'initMap').and.callThrough();

    component.ngOnInit();

    expect(component.initMap).toHaveBeenCalled();
    expect(component.map).toBeDefined();
  });

  it('should handle invalid map configuration', () => {
    spyOn(component.map.getView(), 'setCenter').and.throwError('Invalid center');
    spyOn(component.map.getView(), 'setZoom').and.throwError('Invalid zoom');

    component.ngOnInit();

    expect(component.map).toBeDefined();
  });

  it('should add base OSM layer to the map', () => {
    const layers = component.map.getLayers().getArray();
    const osmLayer = layers.find(layer => layer instanceof TileLayer) as TileLayer<OSM>;
    expect(osmLayer).toBeDefined();
  });

  it('should set default view correctly', () => {
    const view = component.map.getView();
    expect(view.getCenter()).toEqual(fromLonLat([7.084050, 50.737810]));
    expect(view.getZoom()).toEqual(18);
  });

  it('should work with different configurations also', () => {
    component.map.setView(new View({
      center: fromLonLat([12.932450, 50.820410]),
      zoom: 16
    }));

    const view = component.map.getView();
    expect(view.getCenter()).toEqual(fromLonLat([12.932450, 50.820410]));
    expect(view.getZoom()).toEqual(16);
  });

  it('should handle map click events', () => {
    spyOn(component, 'addMapClickListener').and.callThrough();

    component.ngOnInit();

    expect(component.addMapClickListener).toHaveBeenCalled();
  });

  it('should simulate map click and display popup with address', fakeAsync(() => {
    const mockAddress = 'Eifelstraße, 20, Bonn, 53119, Germany';
    const mockCoordinate: [number, number] = [7.084050, 50.737810];

    spyOn(component, 'fetchLocationInfo').and.returnValue(Promise.resolve(mockAddress));

    const olCoordinate: [number, number] = fromLonLat(mockCoordinate) as [number, number];
    component.showPopup(olCoordinate, mockAddress);

    tick();

    const popupContent = document.getElementById('popup-content');
    expect(popupContent?.textContent).toContain(mockAddress);
  }));


  it('should close popup', () => {
    component.popup.setPosition(undefined);
    expect(component.popup.getPosition()).toBeUndefined();
  });

  it('should load Germany GeoJSON data and populate the layer', (done) => {
    component.loadGermanyGeoJson();

    fixture.whenStable().then(() => {
      if (component.germanyGeoJsonLayer && component.germanyGeoJsonLayer.getSource()) {
        expect(component.germanyGeoJsonLayer).toBeDefined();

        const source = component.germanyGeoJsonLayer.getSource();
        if (source) {
          const features = source.getFeatures();
          expect(features.length).toBeGreaterThan(0);
          done();
        } else {
          fail('Germany GeoJSON layer source is null');
        }
      } else {
        fail('Germany GeoJSON layer or its source is undefined');
      }
    });
  });

  it('should add draw interaction for point', () => {
    component.isDrawing = true;
    component.startDrawingPoint();
    expect(component.isDrawing).toBeTrue();

    const interactions = component.map.getInteractions().getArray();
    const drawInteraction = interactions.find(interaction => interaction instanceof Draw);
    expect(drawInteraction).toBeDefined();
  });

  it('should add a point to the drawing layer', fakeAsync(() => {
    component.isDrawing = true;
    component.startDrawingPoint();

    const mockFeature = new Feature({
      geometry: new Point(fromLonLat([7.084050, 50.737810]))
    });

    component.drawingLayer?.getSource()?.addFeature(mockFeature);

    tick();

    const source = component.drawingLayer?.getSource();
    if (source) {
      const features = source.getFeatures();
      expect(features.length).toEqual(1, 'One feature should be added');
    } else {
      fail('Drawing layer source is null');
    }

    discardPeriodicTasks();
  }));



  it('should toggle WMS layer visibility', () => {
    const initialVisibility = component.wmsLayer.getVisible();
    component.toggleWmsLayer();
    expect(component.wmsLayer.getVisible()).not.toBe(initialVisibility);
  });

});
