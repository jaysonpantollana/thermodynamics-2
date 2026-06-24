export interface ComponentSpec {
  name: string;
  category: 'power' | 'boiler' | 'cooling' | 'process';
  color: number;
  desc: string;
  specs: Record<string, string>;
}

export const componentData: Record<string, ComponentSpec> = {
  sinterMachine: {
    name: 'Sintering Machine', category: 'power', color: 0xff6b35,
    desc: 'The sintering machine processes raw iron ore fines, flux, and fuel into sinter through combustion at high temperatures. Includes integrated cooling section where hot sinter is cooled with countercurrent air, recovering heat for the boiler system.',
    specs: { 'Capacity': '550 t/h', 'Gas Temp': '380\u00b0C', 'Sinter Temp': '~1300\u00b0C', 'Cooling': '~800\u00b0C to ~150\u00b0C', 'Type': 'Straight-line reciprocating grate with integrated cooler' }
  },
  boiler: {
    name: 'Boiler (HRSG)', category: 'boiler', color: 0xffcc00,
    desc: 'The Heat Recovery Steam Generator (HRSG) captures waste heat from sinter cooling exhaust gases to produce superheated steam. Contains integrated superheater section that heats saturated steam to 380\u00b0C at 1.96 MPa.',
    specs: { 'Steam Output': '80 t/h', 'Pressure': '2.13 MPa', 'Gas Inlet': '380\u00b0C', 'Superheater': '380\u00b0C, 1.96 MPa', 'Type': 'Once-through HRSG' }
  },
  superheater: {
    name: 'Superheater', category: 'boiler', color: 0xff4444,
    desc: 'Heats saturated steam from the drum to superheated steam at 380\u00b0C and 1.96 MPa. Fin-tube design maximizes heat transfer from hot exhaust gases.',
    specs: { 'Steam Out': '380\u00b0C', 'Pressure': '1.96 MPa', 'Heat Source': 'Hot exhaust gas', 'Type': 'Fin-tube heat exchanger' }
  },
  evaporator: {
    name: 'Evaporator', category: 'boiler', color: 0xffaa00,
    desc: 'Converts water from the economizer into saturated steam. Fin-tube design maximizes heat absorption from hot exhaust gases.',
    specs: { 'Temp': '~215\u00b0C', 'Pressure': '2.13 MPa', 'Quality': 'x = 0.25', 'Type': 'Fin-tube heat exchanger' }
  },
  economizer: {
    name: 'Economizer', category: 'boiler', color: 0x44aaff,
    desc: 'Preheats feedwater using low-temperature exhaust gases before entering the evaporator. Fin-tube design improves thermal efficiency.',
    specs: { 'Water In': '~80\u00b0C', 'Water Out': '~190\u00b0C', 'Gas Side': 'Lowest temp zone', 'Type': 'Fin-tube heat exchanger' }
  },
  steamDrum: {
    name: 'Steam Drum', category: 'boiler', color: 0xffdd44,
    desc: 'Separates steam from the water-steam mixture coming from the evaporator. Dry steam goes to the superheater, while water recirculates. Located at the highest point of the boiler.',
    specs: { 'Pressure': '2.13 MPa', 'Temp': '~215\u00b0C', 'Function': 'Steam-water separation', 'Level Control': 'Automatic' }
  },
  turbine: {
    name: 'Steam Turbine', category: 'power', color: 0x00ccff,
    desc: 'Multi-stage steam turbine converts the thermal energy of superheated steam into rotational mechanical energy. Exhausts steam to the condenser for the closed-loop Rankine cycle.',
    specs: { 'Inlet Steam': '380\u00b0C, 1.96 MPa', 'Type': 'Condensing', 'Exhaust': 'Vacuum condenser', 'Stages': 'Multi-stage' }
  },
  generator: {
    name: 'Generator', category: 'power', color: 0x00ff88,
    desc: 'Converts the mechanical energy from the turbine into electrical power. Rated capacity 18 MW supplies 73% of the total plant power demand (NPC power grid).',
    specs: { 'Rated Output': '18 MW', 'Grid': 'NPC 13.8kV', 'Efficiency': '~97%', 'Type': 'Synchronous' }
  },
  condenser: {
    name: 'Vacuum Condenser', category: 'cooling', color: 0x4488ff,
    desc: 'Condenses exhaust steam from the turbine back into water using sea water cooling. Maintains vacuum conditions to maximize turbine efficiency.',
    specs: { 'Type': 'Surface condenser', 'Coolant': 'Sea water', 'Vacuum': '~5 kPa', 'Condensate': '~40\u00b0C' }
  },
  condensatePump: {
    name: 'Condensate Pump', category: 'cooling', color: 0x6699cc,
    desc: 'Pumps the condensate from the vacuum condenser to the deionized water treatment system and back to the boiler feedwater system.',
    specs: { 'Suction': '~40\u00b0C', 'Discharge': 'To treatment', 'Type': 'Centrifugal', 'Speed': 'Variable' }
  },
  feedPump: {
    name: 'Feed Water Pump', category: 'boiler', color: 0x66ccff,
    desc: 'High-pressure pump that feeds treated water into the boiler economizer. Must overcome the boiler pressure to maintain flow.',
    specs: { 'Discharge Press': '2.4 MPa', 'Type': 'Multi-stage centrifugal', 'Flow': '80 t/h', 'Variable Speed': 'Yes' }
  },
  seaWaterPump: {
    name: 'Sea Water Pump', category: 'cooling', color: 0x3366aa,
    desc: 'Draws sea water for cooling the condenser. Large volume flow to maintain proper condenser vacuum and heat rejection.',
    specs: { 'Source': 'Deep well / Sea', 'Flow Rate': 'High volume', 'Function': 'Condenser cooling', 'Discharge': 'To ocean' }
  },
  deionizedTank: {
    name: 'Deionized Water Treatment', category: 'cooling', color: 0x88ccff,
    desc: 'Treats and purifies the condensate to boiler-quality feedwater. Removes dissolved minerals and gases to prevent scaling and corrosion.',
    specs: { 'Type': 'Deionization', 'Quality': 'Boiler grade', 'Storage': 'Buffer tank', 'Chemical Dosing': 'Yes' }
  },
  inducedFan: {
    name: 'Induced Draft Fan', category: 'process', color: 0x999999,
    desc: 'Creates the draft to pull exhaust gases through the boiler and sinter cooler. Maintains slight negative pressure in the gas path.',
    specs: { 'Type': 'Centrifugal', 'Function': 'Gas flow', 'Control': 'VFD', 'Location': 'Downstream of boiler' }
  },
};
