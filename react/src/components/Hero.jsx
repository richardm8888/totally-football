import styles from '../App.module.css'

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        {/* <img className={styles.heroIcon} src="/assets/icon2.png" alt="Totally Football" /> */}
        <img className={styles.heroLogo} src="/assets/logo3.png" alt="Totally Football" />
        <p className={styles.tagline}>
          Draft your squad. Play your rivals.<br />
          Take the bragging rights.
        </p>
      </div>
    </section>
  )
}

export default Hero
