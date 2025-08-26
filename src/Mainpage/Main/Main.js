import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText, CreditCard, Shield, HeadphonesIcon, Users, Clock,
  CheckCircle, Star, Award, TrendingUp, Zap, Lock
} from 'lucide-react';
import Header from '../../Mainpage/Header/Header.js';
import SEO from '../../Mainpage/Header/SEO.js';
import './Main.css';

const Main = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6 }
    }
  };

  const stats = [
    { number: "10,000+", label: "Bills Generated", icon: FileText },
    { number: "99.9%", label: "Uptime", icon: TrendingUp },
    { number: "500+", label: "Happy Clients", icon: Users },
    { number: "24/7", label: "Support", icon: Clock }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "GAC Owner",
      content: "WYENFOS BILLS transformed our billing process. What used to take hours now takes minutes!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Freelance Consultant",
      content: "The payment tracking feature is incredible. I always know exactly where my money is.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "E-commerce Manager",
      content: "Professional invoices with zero hassle. Our clients love the clean, organized bills.",
      rating: 5
    }
  ];

  const features = [
    {
      icon: FileText,
      title: "Easy Invoicing",
      description: "Create professional, customizable bills in minutes with our intuitive interface",
      benefits: ["Custom templates", "Auto-calculations", "Multi-currency support"]
    },
    {
      icon: CreditCard,
      title: "Payment Tracking",
      description: "Monitor all transactions with real-time updates and comprehensive reporting",
      benefits: ["Real-time notifications", "Payment history", "Revenue analytics"]
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Bank-level security with SSL encryption and secure data storage",
      benefits: ["256-bit SSL encryption", "Secure backups", "GDPR compliant"]
    },
    {
      icon: HeadphonesIcon,
      title: "Customer Support",
      description: "Round-the-clock support from our dedicated team of billing experts",
      benefits: ["24/7 live chat", "Phone support", "Video tutorials"]
    }
  ];

  const trustBadges = [
    { icon: Lock, text: "SSL Secured" },
    { icon: Shield, text: "Data Protected" },
    { icon: Award, text: "Industry Leading" },
    { icon: CheckCircle, text: "Verified Platform" }
  ];

  return (
    <div className="home-container">
      <SEO />
      <Header />
      <main className="homemain-content">

        {/* Hero Section - animate immediately */}
        <motion.section className="homehero-section"
          initial="hidden" animate="visible" variants={containerVariants}>
          <div className="hero-content">
            <motion.div className="hero-text" variants={itemVariants}>
              <h1>Welcome to <span className="brand-highlight">WYENFOS BILLS</span></h1>
              <p className="hero-subtitle">
                Streamline your billing and payment processes with our comprehensive business solution
              </p>
              <p className="hero-description">
                Join thousands of businesses who trust WYENFOS BILLS for their invoicing, payment tracking, and financial management needs.
              </p>
            </motion.div>

            <motion.div className="homecta-buttons" variants={itemVariants}>
              <Link to="/register" className="homecta-button primary">
                <Zap size={20} /> Get Started Free
              </Link>
              <Link to="/login" className="homecta-button secondary">
                Login to Dashboard
              </Link>
            </motion.div>

            <motion.div className="trust-badges" variants={itemVariants}>
              {trustBadges.map((badge, index) => (
                <div key={index} className="trust-badge">
                  <badge.icon size={16} />
                  <span>{badge.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Stats Section */}
        <motion.section className="stats-section"
          initial="hidden" animate="visible" variants={containerVariants}>
          <div className="stats-container">
            {stats.map((stat, index) => (
              <motion.div key={index} className="stat-card" variants={itemVariants}>
                <stat.icon className="stat-icon" size={32} />
                <h3 className="stat-number">{stat.number}</h3>
                <p className="stat-label">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section className="homefeatures-section"
          initial="hidden" animate="visible" variants={containerVariants}>
          <motion.div className="section-header" variants={itemVariants}>
            <h2>Why Choose WYENFOS BILLS?</h2>
            <p>Powerful features designed to simplify your business operations</p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="homefeature-card enhanced"
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="feature-icon">
                  <feature.icon size={40} />
                </div>
                <h3>{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <ul className="feature-benefits">
                  {feature.benefits.map((benefit, idx) => (
                    <li key={idx}>
                      <CheckCircle size={16} /> {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Testimonials */}
        <motion.section className="testimonials-section"
          initial="hidden" animate="visible" variants={containerVariants}>
          <motion.div className="section-header" variants={itemVariants}>
            <h2>What Our Clients Say</h2>
            <p>Trusted by businesses worldwide</p>
          </motion.div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="testimonial-card"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="testimonial-content">"{testimonial.content}"</p>
                <div className="testimonial-author">
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section className="cta-section"
          initial="hidden" animate="visible" variants={containerVariants}>
          <motion.div className="cta-content" variants={itemVariants}>
            <h2>Ready to Transform Your Billing?</h2>
            <p>Join thousands of satisfied customers and start your free trial today</p>
            <div className="cta-buttons-bottom">
              <Link to="/register" className="cta-button-large primary">Start Free Trial</Link>
              <Link to="/login" className="cta-button-large secondary">Login Now</Link>
            </div>
          </motion.div>
        </motion.section>

        {/* About Company */}
        <motion.section className="company-info"
          initial="hidden" animate="visible" variants={itemVariants}>
          <div className="company-details">
            <h3>About WYENFOS BILLS</h3>
            <p>
              We're dedicated to simplifying business operations through innovative billing solutions.
              Our platform combines powerful features with intuitive design to help businesses of all sizes
              manage their finances more effectively.
            </p>
            <div className="contact-info">
              <p><strong>Contact:</strong> support@wyenfosbills.com | +91 8547014116</p>
              <p><strong>Address:</strong> First Floor,Thekkekara Arcade,Chelakottukara Junction,Kuttanelloor Road ,Thrissur,Kerala,India</p>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Main;
