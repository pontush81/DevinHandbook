import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { 
  HandbookSectionCard, 
  IconDemo, 
  handbookSections,
  EmojiIcons,
  LucideIcons 
} from '@/components/ui/HandbookSectionIcons'

describe('HandbookSectionIcons', () => {
  describe('EmojiIcons', () => {
    it('should return correct emojis for each section', () => {
      expect(EmojiIcons.husregler()).toBe('🏠')
      expect(EmojiIcons.kontakt()).toBe('📞')
      expect(EmojiIcons.parkering()).toBe('🚗')
      expect(EmojiIcons.sophantering()).toBe('♻️')
      expect(EmojiIcons.styrelse()).toBe('📋')
    })
  })

  describe('HandbookSectionCard', () => {
    const mockSection = {
      id: 'husregler',
      title: 'Husregler & ordningsregler',
      description: 'Regler och riktlinjer för boende'
    }

    it('should render section title and description', () => {
      render(<HandbookSectionCard section={mockSection} />)
      
      expect(screen.getByText('Husregler & ordningsregler')).toBeInTheDocument()
      expect(screen.getByText('Regler och riktlinjer för boende')).toBeInTheDocument()
    })

    it('should render emoji icon when iconType is emoji', () => {
      render(<HandbookSectionCard section={mockSection} iconType="emoji" />)
      
      expect(screen.getByText('🏠')).toBeInTheDocument()
    })

    it('should render lucide icon by default', () => {
      render(<HandbookSectionCard section={mockSection} />)
      
      // Lucide icon should be rendered (checking for svg element)
      const iconElement = document.querySelector('svg')
      expect(iconElement).toBeInTheDocument()
    })

    it('should render section without description when not provided', () => {
      const sectionWithoutDesc = { ...mockSection, description: undefined }
      render(<HandbookSectionCard section={sectionWithoutDesc} />)
      
      expect(screen.getByText('Husregler & ordningsregler')).toBeInTheDocument()
      expect(screen.queryByText('Regler och riktlinjer för boende')).not.toBeInTheDocument()
    })
  })

  describe('handbookSections data', () => {
    it('should contain all expected sections', () => {
      expect(handbookSections).toHaveLength(5)
      
      const sectionIds = handbookSections.map(section => section.id)
      expect(sectionIds).toContain('husregler')
      expect(sectionIds).toContain('kontakt')
      expect(sectionIds).toContain('parkering')
      expect(sectionIds).toContain('sophantering')
      expect(sectionIds).toContain('styrelse')
    })

    it('should have title and description for each section', () => {
      handbookSections.forEach(section => {
        expect(section.title).toBeTruthy()
        expect(section.description).toBeTruthy()
        expect(section.id).toBeTruthy()
      })
    })
  })

  describe('IconDemo', () => {
    it('should render without crashing', () => {
      render(<IconDemo />)
      
      // Should render headings for each icon type (with capitalize CSS, text becomes capitalized)
      expect(screen.getByText('emoji Ikoner')).toBeInTheDocument()
      expect(screen.getByText('lucide Ikoner')).toBeInTheDocument()
      expect(screen.getByText('hero Ikoner')).toBeInTheDocument()
      expect(screen.getByText('material Ikoner')).toBeInTheDocument()
      expect(screen.getByText('fontawesome Ikoner')).toBeInTheDocument()
    })

    it('should render all sections for each icon type', () => {
      render(<IconDemo />)
      
      // Each section title should appear 5 times (once for each icon type)
      const husreglerElements = screen.getAllByText('Husregler & ordningsregler')
      expect(husreglerElements).toHaveLength(5)
    })
  })
}) 