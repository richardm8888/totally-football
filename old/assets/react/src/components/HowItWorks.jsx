import React from "react";
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import styles from "../App.module.css";

function HowItWorks() {
  var settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 3,
    initialSlide: 0,
    responsive: [
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          dots: true,
        },
      },
    ],
  };
  return (
    <>
        <h2 className={styles.sectionTitle}>How It Works</h2>
      <div className={styles.sliderContainer}>
        <Slider {...settings}>
          <div className={styles.howItWorksItem}>
            <div className={styles.howItWorksInner}>
              <img src="/assets/draft.png" alt="Totally Football" />
            </div>
          </div>
          <div className={styles.howItWorksItem}>
            <div className={styles.howItWorksInner}>
              <img src="/assets/moves.png" alt="Totally Football" />
            </div>
          </div>
          <div className={styles.howItWorksItem}>
            <div className={styles.howItWorksInner}>
              <img src="/assets/draft.png" alt="Totally Football" />
            </div>
          </div>
        </Slider>
      </div>
    </>
  );
}

export default HowItWorks;
