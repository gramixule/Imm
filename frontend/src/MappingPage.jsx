import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MappingPage.css'; // Use the same CSS file for consistency
import axios from 'axios';

const API_URL = 'https://imm-a8ub.onrender.com';


// Function to generate arc coordinates
const generateArcCoordinates = (center, radius, startAngle, endAngle, numPoints) => {
  const coordinates = [];
  const angleStep = (endAngle - startAngle) / numPoints;
  for (let i = 0; i <= numPoints; i++) {
    const angle = startAngle + (i * angleStep);
    const latitude = center[0] + (radius * Math.cos(angle));
    const longitude = center[1] + (radius * Math.sin(angle));
    coordinates.push([latitude, longitude]);
  }
  return coordinates;
};

const generateCircleCoordinates = (center, radius, numPoints) => {
  return generateArcCoordinates(center, radius, 0, 2 * Math.PI, numPoints);
};

const MappingPage = () => {
  const zones = [
    {
      "zone": "Amzei",
      "pot": "65%",
      "cut": "2.5",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 50 mp.",
      "delimitare": [
        [44.44681166477042, 26.096303289738522],
        [44.445413429678446, 26.091023690217042],
        [44.43996607294854, 26.096609847130093],
        [44.44074429786454, 26.0995902662148]
      ],
      "pdf": "amzei.pdf"
    },
    {
      "zone": "Aviatorilor",
      "pot": "50%",
      "cut": "2.0",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 50 mp.",
      "delimitare": [
        // Straight line coordinates
        [44.45231468051471, 26.08644392413257],
        [44.45244268003622, 26.085257042628257],
        [44.453369144399396, 26.0855558976833],
        [44.465333522970724, 26.08601721021653],
        // Arc coordinates
        ...generateArcCoordinates([44.466241501545746, 26.085513425964585], 0.0001, Math.PI, 2 * Math.PI, 50),
        [44.46983671418016, 26.08726386286088],
        [44.472718360046954, 26.087649016171707],
        [44.472456356497226, 26.088374807019665],
        [44.46699721485145, 26.086809749241233],

      ],
      "pdf": "aviatorilor.pdf"
    },
      {
      "zone": "Bonaparte",
      "pot": "40%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.46085226878397, 26.086485352822272],
        [44.45930580332929, 26.086462054853698],
        [44.45937231881549, 26.092682612463086],
        [44.459189401046096, 26.09347474339462],
        [44.45554755527152, 26.089094725302612],
        [44.45539788551762, 26.089933452171298],
        [44.45558081516476, 26.093101975897426],
        [44.452886702436466, 26.093148571834575],
        [44.45300366252654, 26.095145952222996],
        [44.45573649162423, 26.094318992158584],
        [44.45760567305453, 26.0943955625354],
        [44.45960512242049, 26.094546449949046],
        [44.460702612626925, 26.093847510891813]



      ],
      "pdf": "bonaparte.pdf"
    },
       {
      "zone": "Edilitatea",
      "pot": "40%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
          [44.45415618985039, 26.097861663180257],
           [44.45411789803066, 26.097588077874118],
           [44.453945584531176, 26.097652450887328],
           [44.45381539177213, 26.096043125557102],
           [44.455213034165254, 26.09576954025097],
           [44.45527429991582, 26.096815601715612],
           [44.4544204027222, 26.09741641650556],
           [44.454443377698034, 26.097824112255886],
      ],
      "pdf": "edilitatea.pdf"
    },
      {
      "zone": "Tesatoria",
      "pot": "40%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.45578514349712, 26.095612358666358],
        [44.45329612997007, 26.09619462127527],
        [44.45322528363005, 26.09518889495079],
        [44.45566707124854, 26.094738964752995]

      ],
      "pdf": "monard.pdf"
    },
       {
      "zone": "Parcelarea Societatea Generala pentru Construirea de locuinte ieftine",
      "pot": "40%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.457730939806446, 26.095764540965362],
        [44.45728700170642, 26.094454450095316],
        [44.455737914665946, 26.09463309885032],
        [44.45580875795778, 26.095784390827028],
        [44.45529868433822, 26.09601597254648],
        [44.45541203441648, 26.09688274983929],
        [44.45588432404104, 26.09664455149928],
        [44.45596461289732, 26.09694891604485],
        [44.456077961682965, 26.096876133218736],
        [44.45598822724582, 26.09651883570872],
        [44.456743881355294, 26.09602258916704],
        [44.45686667422448, 26.09626078750705],
        [44.45754203038916, 26.095857173653144]
      ],
      "pdf": "52sgcii.pdf"
    },
      {
      "zone": "Mornand",
      "pot": "40%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.46088063945359, 26.086605231830557],
        [44.46542738296605, 26.086620545905916],
        [44.46553667532663, 26.08712591039293],
        [44.464356307003605, 26.08943833577291],
        [44.4639081979641, 26.088596061627882],
        [44.46161295139461, 26.08848886310033],
        [44.46152551164576, 26.090939115158587],
        [44.46223595581461, 26.092393952318172],
        [44.4605636657651, 26.093802847251666],
        [44.460596216115356, 26.088402840954107],
        [44.46081756024746, 26.08835387422242]

      ],
      "pdf": "mornand.pdf"
    },
      {
      "zone": "Filipescu",
      "pot": "40%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.45881067733864, 26.08638902301237],
        [44.45881067733864, 26.092238999801445],
        [44.4536949862604, 26.086450279313823]


      ],
      "pdf": "filipescu.pdf"
    },
      {
      "zone": "Blanc",
      "pot": "65%",
      "cut": "1.8",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.45233947162992, 26.08713941274866],
        [44.45344356252818, 26.08703221422111],
        [44.45544399088393, 26.08932932552572],
        [44.45262369504432, 26.089604978882274]

      ],
      "pdf": "blanc.pdf"
    },
      {
      "zone": "Dorobanti 2",
      "pot": "40%",
      "cut": "2.5",
      "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 50 mp.",
      "delimitare": [
        // Straight line coordinates
        [44.46901980852106, 26.087543937696296],
        [44.46882074147088, 26.089024516948715],
        [44.468353696880484, 26.08891722859709],
        [44.46777945660626, 26.089349866276216],
        [44.46748149299473, 26.088888851542993],
        [44.46607235280995, 26.090358879654588],
        [44.46473767324974, 26.091785415810214],
        [44.46424104050722, 26.090471958740093],
        [44.46578058825661, 26.087218760433966],
        [44.466631046820964, 26.086809936047906]
      ],
      "pdf": "dorobanti2.pdf"
    },
      {
      "zone": "UCB",
      "pot": "25%",
      "cut": "0.8",
      "delimitare": [
        [44.471131442465484, 26.088088599500875],
        [44.47047347524842, 26.090689418467537],
        [44.46874162041942, 26.090263197299087],
        [44.469076822138746, 26.087566696029302]

      ],
      "pdf": "ucb.pdf"
    },
      {
      "zone": "Monnet",
      "pot": "40%",
      "cut": "2.5",
      "delimitare": [
        [44.468868433176674, 26.08898773505651],
          [44.46871530433966, 26.090232279935353],
          [44.47045329304338, 26.0907043486825],
          [44.472313725800994, 26.093633320681842],
          [44.4714639058497, 26.095875647230788],
          [44.468776555922666, 26.094137575934475],
          [44.465790466438136, 26.096133139274688],
          [44.46470318563437, 26.095693257012393],
          [44.465277456171975, 26.09354748997991],
          [44.464756784456924, 26.091659214991324],
          [44.4675285422014, 26.088783887167793],
          [44.46779652285102, 26.089288142420425],
          [44.468340136960975, 26.088901904354575]
      ],
      "pdf": "monnet.pdf"
    },
     {
      "zone": "Dorobanti 1",
      "pot": "40%",
      "cut": "1.8",
       "obiectii": "Suprafata ramasa libera trebuie sa fie de cel putin 30 mp.",
      "delimitare": [
        [44.464220793956244, 26.09055414516876],
        [44.465223857766766, 26.093515303673584],
        [44.464672557652946, 26.095661070706072],
        [44.46074439363988, 26.094437983497556],
        [44.46069844863739, 26.094126847277842],
        [44.46274296625384, 26.09261408151994]

      ],
      "pdf": "dorobanti1.pdf"
    },
  ];

  const [selectedPOT, setSelectedPOT] = useState('');
  const [selectedCUT, setSelectedCUT] = useState('');
  const [file, setFile] = useState(null);
  const [pdfZones, setPdfZones] = useState([]);

  const handlePOTChange = (event) => {
    setSelectedPOT(event.target.value);
  };

  const handleCUTChange = (event) => {
    setSelectedCUT(event.target.value);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      axios.post(`${API_URL}/api/extract_zones_from_pdf`, formData, { withCredentials: true })
        .then(response => {
          setPdfZones(response.data.zones);
        })
        .catch(error => {
          console.error('Error uploading file:', error);
        });
    }
  };

  const filteredZones = zones.filter(zone => {
    return (
      (!selectedPOT || zone.pot === selectedPOT) &&
      (!selectedCUT || zone.cut === selectedCUT)
    );
  });

  return (
    <div className="mapping-page">
      <div className="navbar">
        <h1>Mapping Page</h1>
        <div className="navbar-buttons">
          <Link to="/validation" className="btn btn-validation">Validation</Link>
        </div>
      </div>
      <div className="content">
        <h2>Mapping Content</h2>
        <div className="filters">
          <label>
            POT:
            <select value={selectedPOT} onChange={handlePOTChange}>
              <option value="">All</option>
              <option value="80%">80%</option>
            </select>
          </label>
          <label>
            CUT:
            <select value={selectedCUT} onChange={handleCUTChange}>
              <option value="">All</option>
              <option value="2.5">2.5</option>
            </select>
          </label>
        </div>
        <div>
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
        </div>
        <MapContainer center={[44.4268, 26.1025]} zoom={13} style={{ height: "600px", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredZones.map((zone, index) => (
            <Polygon key={index} positions={zone.delimitare}>
              <Popup>
                <b>{zone.zone}</b><br />
                POT: {zone.pot}<br />
                CUT: {zone.cut}<br />
                Obiectii: {zone.obiectii} <br />
                {zone.pdf && <a href={`http://localhost:5000/uploads/${zone.pdf}`} target="_blank" rel="noopener noreferrer">View PDF</a>}
              </Popup>
            </Polygon>
          ))}
          {pdfZones.map((zone, index) => (
            <Polygon key={index} positions={zone.coordinates}>
              <Popup>
                <b>{zone.zone}</b>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MappingPage;
