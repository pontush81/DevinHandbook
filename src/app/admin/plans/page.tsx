"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Plus, Trash2, Edit, Database } from 'lucide-react';
import Link from 'next/link';
import { 
  PLAN_CONFIGS, 
  PlanConfig, 
  getActivePlans, 
  formatPlanPrice,
  ALLOWED_PLAN_TYPES,
  validatePlanConfig 
} from '@/lib/plans';

export default function AdminPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize with current plan configs
  useEffect(() => {
    const initialPlans = Object.values(PLAN_CONFIGS);
    setPlans(initialPlans);
    setLoading(false);
  }, []);

  const handleSavePlans = async () => {
    setSaving(true);
    try {
      // Here you would typically save to a configuration file or database
      // For now, we'll just simulate the save and show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Planer sparade",
        description: "Plan-konfigurationen har uppdaterats framgångsrikt.",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte spara plan-konfigurationen.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePlan = (planId: string) => {
    setPlans(plans.map(plan => 
      plan.id === planId 
        ? { ...plan, active: !plan.active }
        : plan
    ));
  };

  const handleEditPlan = (plan: PlanConfig) => {
    setEditingPlan({ ...plan });
    setIsCreating(false);
  };

  const handleSaveEditedPlan = () => {
    if (!editingPlan) return;
    
    // Validate the plan
    const errors = validatePlanConfig(editingPlan);
    if (errors.length > 0) {
      toast({
        title: "Validering misslyckades",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    setPlans(plans.map(plan => 
      plan.id === editingPlan.id ? editingPlan : plan
    ));
    setEditingPlan(null);
    setIsCreating(false);
    
    toast({
      title: "Plan uppdaterad",
      description: `${editingPlan.name} har uppdaterats.`,
    });
  };

  const handleCreatePlan = () => {
    const newPlan: PlanConfig = {
      id: `custom_${Date.now()}`,
      name: 'Ny plan',
      type: 'monthly',
      price: 0,
      currency: 'kr',
      duration_days: 30,
      active: false,
      description: 'Beskrivning av ny plan',
      features: ['Funktion 1', 'Funktion 2']
    };
    
    setPlans([...plans, newPlan]);
    setEditingPlan(newPlan);
    setIsCreating(true);
  };

  const handleDeletePlan = (planId: string) => {
    // Prevent deletion of core plans
    const coreplanIds = ['trial', 'monthly', 'annual'];
    if (coreplanIds.includes(planId)) {
      toast({
        title: "Kan inte ta bort",
        description: "Grundläggande planer kan inte tas bort.",
        variant: "destructive",
      });
      return;
    }

    if (confirm('Är du säker på att du vill ta bort denna plan?')) {
      setPlans(plans.filter(plan => plan.id !== planId));
      toast({
        title: "Plan borttagen",
        description: "Planen har tagits bort från konfigurationen.",
      });
    }
  };

  const activePlansCount = plans.filter(p => p.active).length;
  const totalRevenuePotential = plans
    .filter(p => p.active && p.price > 0)
    .reduce((sum, p) => sum + p.price, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plan-hantering</h1>
            <p className="text-gray-500 mt-1">Konfigurera aktiva prenumerationsplaner och prissättning</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreatePlan} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Ny plan
          </Button>
          <Button onClick={handleSavePlans} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{activePlansCount}</div>
            <p className="text-sm text-gray-600">Aktiva planer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{plans.length}</div>
            <p className="text-sm text-gray-600">Totalt planer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-600">{totalRevenuePotential} kr</div>
            <p className="text-sm text-gray-600">Total intäktspotential</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Database Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Databas-constraints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Tillåtna plan-typer i databasen:</p>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_PLAN_TYPES.map(type => (
                <Badge key={type} variant="outline">{type}</Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Nya plan-typer kräver databasuppdatering för att fungera.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`${plan.active ? 'ring-2 ring-green-500' : 'opacity-75'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Badge variant={plan.active ? "default" : "secondary"}>
                    {plan.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  {plan.popular && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Populär
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={plan.active}
                    onCheckedChange={() => handleTogglePlan(plan.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold">
                  {formatPlanPrice(plan)}
                </div>
                {plan.savings && (
                  <div className="text-sm text-green-600 font-medium">{plan.savings}</div>
                )}
              </div>
              
              <p className="text-sm text-gray-600">{plan.description}</p>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">FUNKTIONER</Label>
                <ul className="text-xs space-y-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div>ID: {plan.id}</div>
                <div>Typ: {plan.type}</div>
                {plan.stripe_price_id && <div>Stripe: {plan.stripe_price_id}</div>}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditPlan(plan)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Redigera
                </Button>
                {!['trial', 'monthly', 'annual'].includes(plan.id) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {isCreating ? 'Skapa ny plan' : 'Redigera plan'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Namn</Label>
                <Input
                  id="name"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Plan-typ</Label>
                <select
                  id="type"
                  className="w-full p-2 border rounded-md"
                  value={editingPlan.type}
                  onChange={(e) => setEditingPlan({...editingPlan, type: e.target.value as any})}
                >
                  {ALLOWED_PLAN_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="price">Pris</Label>
                <Input
                  id="price"
                  type="number"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({...editingPlan, price: Number(e.target.value)})}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Beskrivning</Label>
                <Input
                  id="description"
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Varaktighet (dagar)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editingPlan.duration_days || ''}
                  onChange={(e) => setEditingPlan({...editingPlan, duration_days: Number(e.target.value)})}
                />
              </div>

              <div>
                <Label htmlFor="features">Funktioner (en per rad)</Label>
                <textarea
                  id="features"
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  value={editingPlan.features.join('\n')}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan, 
                    features: e.target.value.split('\n').filter(f => f.trim())
                  })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={editingPlan.active}
                  onCheckedChange={(checked) => setEditingPlan({...editingPlan, active: checked})}
                />
                <Label htmlFor="active">Aktiv</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="popular"
                  checked={editingPlan.popular || false}
                  onCheckedChange={(checked) => setEditingPlan({...editingPlan, popular: checked})}
                />
                <Label htmlFor="popular">Populär</Label>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setEditingPlan(null);
                    setIsCreating(false);
                  }}
                >
                  Avbryt
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveEditedPlan}
                >
                  Spara
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 