import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import View from 'ol/View';
import Overlay, { Options as OverlayOptions } from 'ol/Overlay';
import { toStringHDMS } from 'ol/coordinate';
import XYZ from 'ol/source/XYZ';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit {
  map: Map = new Map;
  popup: Overlay = new Overlay({});

  wmsLayer!: TileLayer<XYZ>;

  

  ngOnInit(): void {
    this.initMap(); // Initialize the map
    this.addClickListener(); // Add click listener to the map
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
        duration: 250 // milliseconds
      }
    } as OverlayOptions);

    // Add the overlay to the map
    this.map.addOverlay(this.popup);
    const popupClose = document.getElementById('popupClose');
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
        url: 'https://maps.openweathermap.org/maps/2.0/weather/TA2/{z}/{x}/{y}?appid=f8d5a3b4b35fdb8afca577abbbfc54c7', // TA2(Air temperature at a height of 2 meters) layer
              }),
      visible: false, // Default visibility
    });
    this.map.addLayer(this.wmsLayer); // Add the layer to the map   
  }

  // Event listener to the map and display popup on click
  addClickListener(): void {
    this.map.on('singleclick', async (event) => {
      const coordinate = toLonLat(event.coordinate) as [number, number]; // Convert coordinate to EPSG-4326
      // console.log('Coordinate:', coordinate);  Debugging log for console
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
      if (data.address.road) addressParts.push(data.address.road);
      if (data.address.house_number) addressParts.push(data.address.house_number);
      if (data.address.city) addressParts.push(data.address.city);
      if (data.address.postcode) addressParts.push(data.address.postcode);
      if (data.address.country) addressParts.push(data.address.country);

      return addressParts.join(', ');
    } catch (error) {
      console.error('Error fetching location info:', error);
      return 'Location information not available';
    }
  }

  // Toggle layer visibility on button click
  toggleWmsLayer(): void {
    const isVisible = this.wmsLayer.getVisible();
    this.wmsLayer.setVisible(!isVisible);
  }
}
