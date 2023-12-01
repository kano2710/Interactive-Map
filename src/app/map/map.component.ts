import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import View from 'ol/View';
import Overlay, { Options as OverlayOptions } from 'ol/Overlay';
import { toStringHDMS } from 'ol/coordinate';

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

  ngOnInit(): void {
    this.initMap(); // Initialize the map
    this.addClickListener(); // Add click listener to the map
  }

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


    this.popup = new Overlay({ // Create a new overlay
      element: document.getElementById('popup')!,
      autoPan: true,
      autoPanAnimation: {
        duration: 250 // milliseconds
      }
    } as OverlayOptions);

    this.map.addOverlay(this.popup); // Add the overlay to the map
    const popupClose = document.getElementById('popupClose');
    if (popupClose) {
      popupClose.onclick = () => {
        this.popup.setPosition(undefined);
        popupClose.blur();
      };
    } else {
      throw new Error('popupClose element not found');
    }

  }

  addClickListener(): void { // Event listener to the map and display popup on click
    this.map.on('singleclick', async (event) => {
      const coordinate = toLonLat(event.coordinate) as [number, number]; // Convert coordinate to EPSG-4326
      // console.log('Coordinate:', coordinate);  Debugging log for console
      const address = await this.fetchLocationInfo(coordinate); // Fetch address using coordinates
      this.showPopup(coordinate, address || `Coordinates: ${toStringHDMS(coordinate)}`);                                                                                                                                                                                                                                                       
    });
  }

  showPopup(coordinate: [number, number], content: string): void { // Display popup
    const element = document.getElementById('popup-content');
    if (element) {
      element.innerHTML = content;
      this.popup.setPosition(fromLonLat(coordinate));
    } else {
      console.error('Popup content element not found');
    }
  }

  async fetchLocationInfo(coordinate: [number, number]): Promise<string> { // Fetch address using coordinates
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinate[1]}&lon=${coordinate[0]}`; // Reverse Geocoding API

    try {
      const response = await fetch(url);
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

}
