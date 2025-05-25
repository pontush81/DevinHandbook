import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatisticCard } from '@/components/handbook/StatisticCard';
import { StatisticCard as StatisticCardType } from '@/lib/templates/complete-brf-handbook';

describe('StatisticCard', () => {
  const mockCard: StatisticCardType = {
    title: 'Antal lägenheter',
    value: '42',
    icon: '🏠',
    description: 'Totalt antal lägenheter i föreningen'
  };

  const mockCardWithTrend: StatisticCardType = {
    ...mockCard,
    trend: {
      value: 5.2,
      isPositive: true
    }
  };

  it('renders card with basic information', () => {
    render(<StatisticCard card={mockCard} />);
    
    expect(screen.getByText('Antal lägenheter')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('🏠')).toBeInTheDocument();
    expect(screen.getByText('Totalt antal lägenheter i föreningen')).toBeInTheDocument();
  });

  it('renders card with positive trend', () => {
    render(<StatisticCard card={mockCardWithTrend} />);
    
    expect(screen.getByText('5.2%')).toBeInTheDocument();
    expect(screen.getByText('↗️')).toBeInTheDocument();
  });

  it('renders card with negative trend', () => {
    const cardWithNegativeTrend = {
      ...mockCard,
      trend: {
        value: -2.1,
        isPositive: false
      }
    };

    render(<StatisticCard card={cardWithNegativeTrend} />);
    
    expect(screen.getByText('2.1%')).toBeInTheDocument();
    expect(screen.getByText('↘️')).toBeInTheDocument();
  });

  it('applies correct CSS classes for hover effects', () => {
    const { container } = render(<StatisticCard card={mockCard} />);
    const cardElement = container.firstChild as HTMLElement;
    
    expect(cardElement).toHaveClass('hover:shadow-md');
    expect(cardElement).toHaveClass('transition-shadow');
  });
}); 