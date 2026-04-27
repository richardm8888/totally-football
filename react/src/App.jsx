import Hero from './components/Hero'
import Description from './components/Description'
import Details from './components/Details'
import Status from './components/Status'
import Footer from './components/Footer'
import Divider from './components/Divider'
import './App.module.css'
import HowItWorks from './components/HowItWorks'

function App() {
  return (
    <>
      <main>
        <Hero />
        <Description />
        <Divider />
        <HowItWorks />
        <Divider />
        <Details />
        <Divider />
        <Status />
      </main>
      <Footer />
    </>
  )
}

export default App
