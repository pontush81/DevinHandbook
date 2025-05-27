"use client"

import React, { useState } from 'react';
import { HandbookLayout } from '@/components/layout/HandbookLayout';
import { HandbookSection } from '@/types/handbook';
import { ContentArea } from '@/components/handbook/ContentArea';

// Test-data med svenska menyalternativ
const testSections: HandbookSection[] = [
  {
    id: '1',
    title: 'Välkommen',
    description: 'Välkommen till föreningens digitala handbok',
    order_index: 1,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '1-1',
        title: 'Översikt och snabbfakta',
        content: '# Välkommen till vår förening\n\nHär hittar du all viktig information om ditt boende.',
        order_index: 1,
        section_id: '1',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '2',
    title: 'Kontaktuppgifter och styrelse',
    description: 'Kontaktinformation till styrelse och viktiga personer',
    order_index: 2,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '2-1',
        title: 'Styrelsemedlemmar',
        content: '# Styrelsen\n\n## Ordförande\nAnna Andersson\n\n## Vice ordförande\nPer Persson',
        order_index: 1,
        section_id: '2',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '3',
    title: 'Felanmälan',
    description: 'Rapportera fel och problem i fastigheten',
    order_index: 3,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '3-1',
        title: 'Hur du anmäler fel',
        content: '# Felanmälan\n\nKontakta vaktmästaren på telefon 08-765 43 21.',
        order_index: 1,
        section_id: '3',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '4',
    title: 'Ekonomi och avgifter',
    description: 'Information om föreningens ekonomi och månadsavgifter',
    order_index: 4,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '4-1',
        title: 'Månadsavgifter',
        content: '# Avgifter\n\nMånadsavgiften betalas senast den 25:e varje månad.',
        order_index: 1,
        section_id: '4',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '5',
    title: 'Trivselregler',
    description: 'Regler för en trivsam gemenskap',
    order_index: 5,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '5-1',
        title: 'Ordningsregler',
        content: '# Trivselregler\n\nVi respekterar varandra och våra gemensamma utrymmen.',
        order_index: 1,
        section_id: '5',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '6',
    title: 'Stadgar och årsredovisning',
    description: 'Föreningens stadgar och ekonomiska rapporter',
    order_index: 6,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '6-1',
        title: 'Stadgar',
        content: '# Stadgar\n\nFöreningens stadgar reglerar verksamheten.',
        order_index: 1,
        section_id: '6',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '7',
    title: 'Renoveringar och underhåll',
    description: 'Pågående och planerade renoveringsprojekt',
    order_index: 7,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '7-1',
        title: 'Pågående projekt',
        content: '# Renoveringar\n\nFasadrenovering pågår under 2024.',
        order_index: 1,
        section_id: '7',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '8',
    title: 'Bopärmar och regler',
    description: 'Regler och information för boende',
    order_index: 8,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '8-1',
        title: 'Boendeinfo',
        content: '# Boendeinfo\n\nViktig information för alla boende.',
        order_index: 1,
        section_id: '8',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '9',
    title: 'Sopsortering och återvinning',
    description: 'Riktlinjer för avfallshantering',
    order_index: 9,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '9-1',
        title: 'Sorteringsguide',
        content: '# Sopsortering\n\nSå sorterar du ditt avfall korrekt.',
        order_index: 1,
        section_id: '9',
        lastUpdated: '2024-01-15'
      }
    ]
  },
  {
    id: '10',
    title: 'Parkering och garage',
    description: 'Regler för parkering och garage',
    order_index: 10,
    handbook_id: 'test',
    is_public: true,
    pages: [
      {
        id: '10-1',
        title: 'Parkeringsregler',
        content: '# Parkering\n\nRegler för parkering i föreningens garage.',
        order_index: 1,
        section_id: '10',
        lastUpdated: '2024-01-15'
      }
    ]
  }
];

export default function TestSidebarPage() {
  const [currentPageId, setCurrentPageId] = useState<string>('');

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
  };

  const handleSectionSelect = (sectionId: string) => {
    // Rensa vald sida för att visa hela sektionen
    setCurrentPageId('');
    
    // Scrolla till sektionen
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <HandbookLayout
      sections={testSections}
      currentPageId={currentPageId}
      onPageSelect={handlePageSelect}
      onSectionSelect={handleSectionSelect}
      handbookTitle="Test Handbok"
      showAuth={true}
    >
      <ContentArea
        sections={testSections}
        currentPageId={currentPageId}
        isEditMode={false}
        handbookId="test-handbook"
        onUpdateSection={() => {}}
        onUpdatePage={() => {}}
        onAddPage={() => {}}
        onAddSection={() => {}}
        onMoveSection={() => {}}
        onDeleteSection={() => {}}
        onExitEditMode={() => {}}
      />
    </HandbookLayout>
  );
} 