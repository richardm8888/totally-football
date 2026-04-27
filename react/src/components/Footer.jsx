import styles from '../App.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <a href="https://richardm8888.github.io/double-time-games">
            <img 
              src="/assets/double-time-games.png" 
              alt="Double Time Games" 
              className={styles.footerLogo}
            />
          </a>
          <p className={styles.copyright}>&copy; 2026 Double Time Games</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
