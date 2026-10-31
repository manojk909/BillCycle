import { describe, expect, it } from 'vitest';
import { variantLabel, variantPrice } from './products.pricing';

describe('variantPrice', () => {
  it('product 1200 + Brand=Odoo (+560) = 1760', () => {
    expect(variantPrice({ salesPrice: 1200 }, [{ extraPrice: 560 }]).toFixed(2)).toBe('1760.00');
  });

  it('default variant (no values) is the sales price', () => {
    expect(variantPrice({ salesPrice: '999.00' }).toFixed(2)).toBe('999.00');
    expect(variantPrice({ salesPrice: '999.00' }, []).toFixed(2)).toBe('999.00');
  });

  it('adds every value extra price', () => {
    expect(variantPrice({ salesPrice: 1000 }, [{ extraPrice: 560 }, { extraPrice: '99.50' }]).toFixed(2)).toBe('1659.50');
  });

  it('a zero extra price leaves the price unchanged', () => {
    expect(variantPrice({ salesPrice: 1200 }, [{ extraPrice: 0 }]).toFixed(2)).toBe('1200.00');
  });

  it('uses decimal math, not floats (0.1 + 0.2)', () => {
    expect(variantPrice({ salesPrice: '0.10' }, [{ extraPrice: '0.20' }]).toFixed(2)).toBe('0.30');
  });
});

describe('variantLabel', () => {
  it('default variant is just the product name', () => {
    expect(variantLabel({ name: 'Brightloop CRM' })).toBe('Brightloop CRM');
  });

  it('lists values with their attribute, sorted by attribute name', () => {
    const values = [
      { name: '10', attribute: { name: 'Seats' } },
      { name: 'Odoo', attribute: { name: 'Brand' } },
    ];
    expect(variantLabel({ name: 'Brightloop CRM' }, values)).toBe('Brightloop CRM (Brand: Odoo, Seats: 10)');
  });
});
