import React, { useMemo, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import type { Equipment } from '../types/equipment';
import type { FleetBillingSummary } from '../types/billing';
import type { AlertItem } from '../types/equipment';
import type { DemandForecastResponse } from './DemandForecastPanel';

interface DealerAssistantPanelProps {
  equipmentList: Equipment[];
  alerts: AlertItem[];
  billing: FleetBillingSummary | null;
  forecast?: DemandForecastResponse | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const DealerAssistantPanel: React.FC<DealerAssistantPanelProps> = ({ equipmentList, alerts, billing, forecast }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'I can help you spot underutilized assets, overdue rentals, and high-cost equipment in the fleet. Ask me about idle cost, overdue risk, or the most urgent machine to act on.'
    }
  ]);

  const retrievalContext = useMemo(() => {
    const overdueMachines = equipmentList.filter((equipment) => equipment.is_overdue || equipment.status === 'OVERDUE');
    const idleMachines = equipmentList.filter((equipment) => equipment.status === 'IDLE' || equipment.utilization_percentage < 40);
    const activeMachines = equipmentList.filter((item) => item.status === 'ACTIVE');
    const urgentAlerts = alerts.filter((alert) => !alert.acknowledged && !alert.resolved);
    const topCostAsset = billing && billing.items.length
      ? [...billing.items].sort((a, b) => b.total_invoice_amount - a.total_invoice_amount)[0]
      : null;
    const highestDemandSite = forecast && forecast.site_forecast.length
      ? [...forecast.site_forecast].sort((a, b) => b.projected_demand - a.projected_demand)[0]
      : null;

    return {
      overdueMachines,
      idleMachines,
      activeMachines,
      urgentAlerts,
      topCostAsset,
      highestDemandSite,
    };
  }, [equipmentList, alerts, billing, forecast]);

  const quickActions = useMemo(() => [
    'Which asset is costing the most?',
    'Show overdue vehicles',
    'What should I prioritize?',
    'Which machines are idle?',
    'Which is the most demanding site?'
  ], []);

  const buildResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('demanding site') || lowerQuestion.includes('most demanding') || lowerQuestion.includes('demanding')) {
      if (retrievalContext.highestDemandSite) {
        return `The most demanding site is ${retrievalContext.highestDemandSite.site_id}. It is projected to need ${retrievalContext.highestDemandSite.projected_demand} units with ${retrievalContext.highestDemandSite.utilization}% utilization and ${retrievalContext.highestDemandSite.risk_level.toLowerCase()} risk.`;
      }
      return 'There is no site demand forecast available right now, but the active fleet and utilization metrics suggest the current bottleneck is the largest busy site.';
    }

    if (billing && (lowerQuestion.includes('cost') || lowerQuestion.includes('expensive') || lowerQuestion.includes('costing the most'))) {
      const worst = retrievalContext.topCostAsset;
      if (worst) {
        return `${worst.equipment_id} is the largest cost driver right now at ${currency.format(worst.total_invoice_amount)}. Its idle penalty is ${currency.format(worst.idle_penalty_cost)} and overdue penalty is ${currency.format(worst.overdue_penalty_cost)}.`;
      }
    }

    if (lowerQuestion.includes('overdue') || lowerQuestion.includes('late')) {
      if (retrievalContext.overdueMachines.length) {
        const first = retrievalContext.overdueMachines[0];
        return `${first.equipment_id} is currently your most urgent overdue asset. It is marked ${first.status} and should be reviewed with return scheduling and operator assignment.`;
      }
      return 'No overdue equipment is currently flagged in the fleet.';
    }

    if (lowerQuestion.includes('idle') || lowerQuestion.includes('underutilized')) {
      if (retrievalContext.idleMachines.length) {
        const sample = retrievalContext.idleMachines[0];
        return `${sample.equipment_id} is underperforming with ${sample.utilization_percentage}% utilization. That is likely reducing rental efficiency and increasing idle cost exposure.`;
      }
      return 'No machines are currently showing high idle risk.';
    }

    if (lowerQuestion.includes('prioritize') || lowerQuestion.includes('next')) {
      const urgentAlert = retrievalContext.urgentAlerts[0];
      if (urgentAlert) {
        return `Prioritize ${urgentAlert.equipment_id} first. It is flagged by the alert system and needs immediate follow-up before idle or downtime losses worsen.`;
      }
      if (retrievalContext.topCostAsset) {
        return `Prioritize ${retrievalContext.topCostAsset.equipment_id}. It has the highest total cost exposure in the fleet and is likely to create the largest margin loss if left unmanaged.`;
      }
      return 'The fleet looks stable. Focus on the highest-cost machine and any equipment with utilization below 40%.';
    }

    const activeCount = retrievalContext.activeMachines.length;
    const idleCount = retrievalContext.idleMachines.length;
    return `The fleet currently has ${activeCount} active machines and ${idleCount} idle machines. The best immediate move is to reassign or redeploy low-utilization equipment and resolve overdue returns before they compound cost.`;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    const answer = buildResponse(trimmed);
    setTimeout(() => {
      setMessages((current) => [...current, { role: 'assistant', text: answer }]);
    }, 200);

    setInput('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#FFCD00] border border-black p-2">
            <Bot className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-600">Dealer support</p>
            <h2 className="text-2xl font-black text-gray-900">AI Fleet Assistant</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
          <Sparkles className="w-3.5 h-3.5" />
          Live insight
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setInput(action)}
              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-[#FFCD00] hover:text-black transition-colors"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 max-h-80 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-medium ${
                  message.role === 'user'
                    ? 'bg-[#FFCD00] text-black border border-black'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask: Which asset is costing the most?"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FFCD00] border border-black px-4 py-2 text-sm font-black text-black shadow-sm"
          >
            <Send className="w-4 h-4" />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
};
