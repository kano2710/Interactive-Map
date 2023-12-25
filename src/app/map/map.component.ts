import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import View from 'ol/View';
import Overlay, { Options as OverlayOptions } from 'ol/Overlay';
import { toStringHDMS } from 'ol/coordinate';
import XYZ from 'ol/source/XYZ';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Geometry } from 'ol/geom';
import { Feature } from 'ol';
import Draw from 'ol/interaction/Draw';
import { NgIf } from '@angular/common';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [HttpClientModule, NgIf],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})

export class MapComponent implements OnInit {

  map: Map = new Map;
  popup: Overlay = new Overlay({});
  wmsLayer!: TileLayer<XYZ>;
  germanyGeoJsonLayer?: VectorLayer<VectorSource<Feature<Geometry>>>;
  indiaGeoJsonLayer?: VectorLayer<VectorSource<Feature<Geometry>>>;
  drawingLayer?: VectorLayer<VectorSource<Feature<Geometry>>>;
  isDrawing: boolean = false;

  // Styles for drawing features
  pointStyle = new Style({ image: new CircleStyle({ radius: 5, fill: new Fill({ color: 'red' }), stroke: new Stroke({ color: 'black', width: 1 }) }) });
  lineStyle = new Style({ stroke: new Stroke({ color: 'green', width: 2 }) });
  polygonStyle = new Style({ stroke: new Stroke({ color: 'blue', width: 2 }), fill: new Fill({ color: 'rgba(0, 0, 255, 0.5)' }) });
  circleStyle = new Style({ stroke: new Stroke({ color: 'yellow', width: 2 }), fill: new Fill({ color: 'rgba(255, 255, 0, 0.5)' }) });

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.initMap(); // Initialize the map
    this.addMapClickListener(); // Add click listener to the map
    this.loadGeoJson(); // Load GeoJSON data
  }

  // Map initialization
  initMap(): void {
    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM() // Open Street Map Layer
        })
      ],
      view: new View({
        center: fromLonLat([7.084050, 50.737810]), // Default address - Eifel Str. 20, Bonn, 53119, Germnany.
        zoom: 18 // Default Zoom Level obtain from https://nominatim.org/release-docs/latest/api/Reverse/
      })
    });

    // Create a new overlay to display the popup
    this.popup = new Overlay({
      element: document.getElementById('popup')!,
      autoPan: true,
      autoPanAnimation: {
        duration: 250 // in milliseconds
      }
    } as OverlayOptions);

    // Add the overlay to the map
    this.map.addOverlay(this.popup);
    const popupClose = document.getElementById('popupClose'); // Get the close button element
    if (popupClose) {
      popupClose.onclick = () => {
        this.popup.setPosition(undefined);
        popupClose.blur();
      };
    } else {
      throw new Error('popupClose element not found');
    }

    // Open Weather Map Layer
    this.wmsLayer = new TileLayer({
      source: new XYZ({
        url: 'https://maps.openweathermap.org/maps/2.0/weather/TA2/{z}/{x}/{y}?appid={APIKey}', // TA2(Air temperature at a height of 2 meters) layer
      }),
      visible: false, // Default visibility (currently hidden)
    });
    this.map.addLayer(this.wmsLayer);

    // Drawing layer
    this.drawingLayer = new VectorLayer({
      source: new VectorSource(),
      style: (feature) => {
        switch (feature.getGeometry()?.getType()) {
          case 'Point':
            return this.pointStyle;
          case 'LineString':
            return this.lineStyle;
          case 'Polygon':
            return this.polygonStyle;
          case 'Circle':
            return this.circleStyle;
          default:
            return undefined;
        }
      }
    });
    this.map.addLayer(this.drawingLayer);
  }

  // Event listener to the map and display popup on click
  addMapClickListener(): void {
    this.map.on('singleclick', async (event) => {
      if (this.isDrawing) { // Don't show popup when drawing
        return;
      }

      const coordinate = toLonLat(event.coordinate) as [number, number]; // Convert to lonlat
      const address = await this.fetchLocationInfo(coordinate); // Fetch address using coordinates
      this.showPopup(coordinate, address || `Coordinates: ${toStringHDMS(coordinate)}`);
    });
  }

  // Display popup with address
  showPopup(coordinate: [number, number], content: string): void {
    const element = document.getElementById('popup-content');
    if (element) {
      element.innerHTML = content;
      this.popup.setPosition(fromLonLat(coordinate)); // Set popup position
    } else {
      console.error('Popup content element not found');
    }
  }

  // Fetch address using coordinates
  async fetchLocationInfo(coordinate: [number, number]): Promise<string> {
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinate[1]}&lon=${coordinate[0]}`; // Reverse Geocoding API
    try {
      const response = await fetch(reverseUrl);
      const data = await response.json();
      // console.log('Location Info:', data); // Debugging log for console
      const addressParts = [];
      if (data.address.road) addressParts.push(data.address.road);  // Street name
      if (data.address.house_number) addressParts.push(data.address.house_number); // House number
      if (data.address.city) addressParts.push(data.address.city); // City
      if (data.address.postcode) addressParts.push(data.address.postcode); // Postal code
      if (data.address.country) addressParts.push(data.address.country); // Country
      return addressParts.join(', ');
    } catch (error) {
      console.error('Error fetching location info:', error);
      return 'Location information not available';
    }
  }

  // Temperature layer visibility on button click
  toggleWmsLayer(): void {
    const isVisible = this.wmsLayer.getVisible();
    this.wmsLayer.setVisible(!isVisible);
  }

  // Load GeoJSON data
  loadGeoJson(): void {
    this.loadGermanyGeoJson();
    this.loadIndiaGeoJson();
  }

  // Create or update GeoJSON layer
  createOrUpdateLayer(geoJsonData: any, layerProperty: 'germanyGeoJsonLayer' | 'indiaGeoJsonLayer'): void {
    const features = (new GeoJSON().readFeatures(geoJsonData, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    }) as unknown) as Feature<Geometry>[]; // Type assertion

    let layer = this[layerProperty];
    if (layer) {
      // Update existing layer
      layer.getSource()?.clear();
      layer.getSource()?.addFeatures(features);
    } else {
      // Create new layer
      layer = new VectorLayer({
        source: new VectorSource({ features }),
      });
      this[layerProperty] = layer;
      this.map.addLayer(layer);
    }
  }

  // Load Germany GeoJSON data
  loadGermanyGeoJson(): void {
    this.http.get('assets/germany.geojson').subscribe( // Load GeoJSON data from assets folder
      geoJsonData => this.createOrUpdateLayer(geoJsonData, 'germanyGeoJsonLayer'),
      error => console.error('Error loading Germany GeoJSON:', error)
    );
  }

  // Load India GeoJSON data
  loadIndiaGeoJson(): void {
    this.http.get('assets/india.geojson').subscribe( // Load GeoJSON data from assets folder
      geoJsonData => this.createOrUpdateLayer(geoJsonData, 'indiaGeoJsonLayer'),
      error => console.error('Error loading India GeoJSON:', error)
    );
  }

  // Add draw interaction
  addDrawInteraction(drawType: 'Point' | 'LineString' | 'Polygon' | 'Circle'): void {
    if (this.isDrawing && this.drawingLayer && this.drawingLayer.getSource()) {
      let style;
      switch (drawType) {
        case 'Point':
          style = this.pointStyle;
          break;
        case 'LineString':
          style = this.lineStyle;
          break;
        case 'Polygon':
          style = this.polygonStyle;
          break;
        case 'Circle':
          style = this.circleStyle;
          break;
      }
      // Add draw interaction only when drawing is enabled
      if (this.isDrawing && this.drawingLayer && this.drawingLayer.getSource()) {
        this.removeDrawInteractions();

        const draw = new Draw({
          source: this.drawingLayer.getSource() as VectorSource<Feature<Geometry>>,
          type: drawType,
          style: style
        });
        this.map.addInteraction(draw);
      }
    }
  }

  // Draw point
  startDrawingPoint(): void {
    this.addDrawInteraction('Point');
  }

  // Draw line
  startDrawingLine(): void {
    this.addDrawInteraction('LineString');
  }

  // Draw polygon
  startDrawingPolygon(): void {
    this.addDrawInteraction('Polygon');
  }

  // Draw circle
  startDrawingCircle(): void {
    this.addDrawInteraction('Circle');
  }

  // Toggle drawing
  toggleDrawing(): void {
    this.isDrawing = !this.isDrawing;
    // Add draw interaction and remove map click listener only when drawing is enabled
    if (this.isDrawing) {
      this.map.un('singleclick', this.addMapClickListener);
      this.addDrawInteraction('Point');
    } else {
      this.removeDrawInteractions();
      this.addMapClickListener();
    }
  }

  // Remove draw interactions
  removeDrawInteractions(): void {
    const drawInteractions = this.map.getInteractions().getArray()
      .filter(interaction => interaction instanceof Draw);
    drawInteractions.forEach(interaction => this.map.removeInteraction(interaction));
  }

  // Reload page
  reloadPage(): void {
    window.location.reload();
  }
}
