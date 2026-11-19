import { forwardRef } from 'react';

const WorkTitle = forwardRef(function WorkTitle({ revealed = false }, ref) {
  return (
    <h2
      ref={ref}
      id="work-title"
      className={`work-title-reveal ${revealed ? 'is-revealed' : ''}`.trim()}
    >
      <span className="work-title-line work-title-line--selected">SELECTED</span>
      {' '}
      <em className="work-title-line work-title-line--frequencies">
        FREQUENCIES
      </em>
    </h2>
  );
});

export default WorkTitle;
