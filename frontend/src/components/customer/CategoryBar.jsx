import React from 'react';
import { Link } from 'react-router-dom';

const categories = [
  { name: "Women's Ethnic", slug: 'womens-ethnic', icon: 'bi-gem' },
  { name: "Men's Formal", slug: 'mens-wear', icon: 'bi-suit-club' },
  { name: "Western Dresses", slug: 'womens-western', icon: 'bi-stars' },
  { name: "Kids Festive", slug: 'kids-festive', icon: 'bi-balloon' },
  { name: "Dupattas & Stoles", slug: 'accessories', icon: 'bi-gift' },
  { name: "All Products", slug: '', icon: 'bi-grid-3x3-gap' }
];

const CategoryBar = () => {
  return (
    <div className="bg-white border-bottom shadow-sm py-2">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between overflow-x-auto gap-3 py-1">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.slug ? `/products?category=${cat.slug}` : '/products'}
              className="text-center text-decoration-none px-3 py-1 rounded-pill bg-light border text-nowrap d-flex align-items-center gap-2 text-dark hover-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <i className={`bi ${cat.icon} text-primary`}></i>
              <span className="fw-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
