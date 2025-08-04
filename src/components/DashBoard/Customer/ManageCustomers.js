import React, { useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import CustomerForm from './CustomerForm';
import CustomerList from './CustomerList';
import CustomerSelect from './CustomerSelect';
import './customer.css';

function ManageCustomers() {
  const bookRef = useRef();

  const handleCornerClick = (direction) => {
    if (direction === 'left' && bookRef.current.pageFlip().getCurrentPageIndex() > 0) {
      bookRef.current.pageFlip().flipPrev();
    } else if (direction === 'right' && bookRef.current.pageFlip().getCurrentPageIndex() < bookRef.current.pageFlip().getPageCount() - 1) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  return (
    <div className="manage-customers-container">
      <div className="manage-customers-title">
        Manage Customers (Book Flip)
      </div>

      <div className="flip-book-container">
        <div className="flip-book-wrapper">
          <HTMLFlipBook
            width={800}
            height={600}
            size="fixed"
            minWidth={315}
            maxWidth={800}
            minHeight={400}
            maxHeight={800}
            maxShadowOpacity={0.2}
            showCover={false}
            mobileScrollSupport={true}
            ref={bookRef}
            className="flip-book"
            flippingTime={1000}
            usePortrait={true}
            clickEventForward={false}
            onClick={(e) => e.stopPropagation()}
            disableFlipByClick={true} // Explicitly disable flip by click
          >
            <div className="book-page">
              <CustomerForm />
            </div>
            <div className="book-page">
              <CustomerList />
            </div>
            <div className="book-page">
              <CustomerSelect selectedId="" onChange={() => {}} />
            </div>
          </HTMLFlipBook>
          <div
            className="corner-flip left-bottom"
            onClick={(e) => {
              e.stopPropagation();
              handleCornerClick('left');
            }}
          ></div>
          <div
            className="corner-flip right-bottom"
            onClick={(e) => {
              e.stopPropagation();
              handleCornerClick('right');
            }}
          ></div>
        </div>
      </div>

      <div className="nav-buttons">
        <button onClick={() => bookRef.current.pageFlip().flipPrev()} className="nav-button">← Previous</button>
        <button onClick={() => bookRef.current.pageFlip().flipNext()} className="nav-button">Next →</button>
      </div>
    </div>
  );
}

export default ManageCustomers;