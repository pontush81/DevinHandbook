import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export type HandbookSectionCardProps = {
  title: string;
  description: string;
  className?: string;
};

const HandbookSectionCard: React.FC<HandbookSectionCardProps> = ({ title, description, className = '' }) => (
  <Card className={`mb-4 ${className}`} style={{ borderRadius: '16px' }}>
    <CardHeader>
      <CardTitle className="font-handbook text-lg md:text-xl mb-2">{title}</CardTitle>
      <CardDescription className="text-base">{description}</CardDescription>
    </CardHeader>
  </Card>
);

export default HandbookSectionCard; 