import { create } from 'zustand';
import { defaultHandbookTemplate, HandbookTemplate } from '../templates/handbook-template';

export interface HandbookState {
  name: string;
  subdomain: string;
  
  template: HandbookTemplate;
  
  currentStep: number;
  
  setName: (name: string) => void;
  setSubdomain: (subdomain: string) => void;
  setCurrentStep: (step: number) => void;
  toggleSectionActive: (sectionId: string) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  updateSectionDescription: (sectionId: string, description: string) => void;
  updatePageTitle: (sectionId: string, pageId: string, title: string) => void;
  updatePageContent: (sectionId: string, pageId: string, content: string) => void;
  resetWizard: () => void;
}

export const useHandbookStore = create<HandbookState>((set) => ({
  name: '',
  subdomain: '',
  template: defaultHandbookTemplate,
  currentStep: 0,
  
  setName: (name) => set({ name }),
  setSubdomain: (subdomain) => set({ subdomain }),
  setCurrentStep: (step) => set({ currentStep: step }),
  
  toggleSectionActive: (sectionId) => set((state) => ({
    template: {
      ...state.template,
      sections: state.template.sections.map((section) => 
        section.id === sectionId 
          ? { ...section, isActive: !section.isActive } 
          : section
      )
    }
  })),
  
  updateSectionTitle: (sectionId, title) => set((state) => ({
    template: {
      ...state.template,
      sections: state.template.sections.map((section) => 
        section.id === sectionId 
          ? { ...section, title } 
          : section
      )
    }
  })),
  
  updateSectionDescription: (sectionId, description) => set((state) => ({
    template: {
      ...state.template,
      sections: state.template.sections.map((section) => 
        section.id === sectionId 
          ? { ...section, description } 
          : section
      )
    }
  })),
  
  updatePageTitle: (sectionId, pageId, title) => set((state) => ({
    template: {
      ...state.template,
      sections: state.template.sections.map((section) => 
        section.id === sectionId 
          ? { 
              ...section, 
              pages: section.pages.map((page) => 
                page.id === pageId 
                  ? { ...page, title } 
                  : page
              ) 
            } 
          : section
      )
    }
  })),
  
  updatePageContent: (sectionId, pageId, content) => set((state) => ({
    template: {
      ...state.template,
      sections: state.template.sections.map((section) => 
        section.id === sectionId 
          ? { 
              ...section, 
              pages: section.pages.map((page) => 
                page.id === pageId 
                  ? { ...page, content } 
                  : page
              ) 
            } 
          : section
      )
    }
  })),
  
  resetWizard: () => set({
    name: '',
    subdomain: '',
    template: defaultHandbookTemplate,
    currentStep: 0
  })
}));
