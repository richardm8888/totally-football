import styles from '../App.module.css'

function Details() {
  return (
    <section className={styles.details}>
      <div className={styles.container}>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <h3>Players</h3>
            <p>2-4</p>
          </div>
          <div className={styles.detailItem}>
            <h3>Time</h3>
            <p>20-30 min</p>
          </div>
          <div className={styles.detailItem}>
            <h3>Age</h3>
            <p>12+</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Details
