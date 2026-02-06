// HMR-Refresh: 2026-02-04
import React from 'react'
import About from '../../components/about/About'
import Animation from '../../components/animation/Animation'
import Roadmap from '../../components/roadmap/Roadmap'
import Team from '../../components/team/Team'
import FAQ from '../../components/faq/FAQ'

import MintGUI from '../../components/mintgui/MintGUI'
import CosmicRecipeWidget from '../../components/CosmicRecipeWidget.tsx'

import './main.css'

const Main = () => {
  // Mock SavedChartData for testing purposes as requested
  const mockSavedChart = {
    year: 1990,
    month: 10,
    day: 15,
    time: '12:00',
    latitude: 34.0522,   // Example: Los Angeles latitude
    longitude: -118.2437 // Example: Los Angeles longitude
  };

  return (
    <div className='main'>
      <MintGUI />
      <CosmicRecipeWidget savedChart={mockSavedChart} />
      <About />
      <Roadmap />
      <Team />
      <FAQ />
      <Animation />
    </div>
  )
}

export default Main
