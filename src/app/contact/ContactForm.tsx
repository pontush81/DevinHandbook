'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ContactFormProps {
  onSubmit: (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => void;
}

export default function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Call the parent's onSubmit handler
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Namn
          </label>
          <div className="mt-1">
            <Input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-post
          </label>
          <div className="mt-1">
            <Input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
          Ämne
        </label>
        <div className="mt-1">
          <Input
            type="text"
            name="subject"
            id="subject"
            value={formData.subject}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Meddelande
        </label>
        <div className="mt-1">
          <Textarea
            rows={6}
            name="message"
            id="message"
            value={formData.message}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">
          Skicka meddelande
        </Button>
      </div>
    </form>
  );
} 