"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type WorkflowRoi = { label: string; investment: number; annualValue: number };

export function RoiExplorer({ workflows }: { workflows: WorkflowRoi[] }) {
  const [multiplier, setMultiplier] = useState(1);

  const totals = useMemo(() => {
    const investment = workflows.reduce((sum, w) => sum + w.investment, 0);
    const annualValue = Math.round(workflows.reduce((sum, w) => sum + w.annualValue, 0) * multiplier);
    const roi = investment > 0 ? Math.round(((annualValue - investment) / investment) * 100) : 0;
    return { investment, annualValue, roi };
  }, [workflows, multiplier]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Configurable assumptions"
          subtitle="Adjust the productivity value multiplier to stress-test the model"
        />
        <CardBody>
          <label className="flex items-center justify-between text-xs font-medium text-ink-600">
            <span>Productivity value assumption</span>
            <span>{multiplier.toFixed(2)}x</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value))}
            className="mt-2 w-full accent-brand-700"
          />
          <p className="mt-2 text-xs text-ink-500">
            Default (1.0x) uses each workflow's estimated hours saved × a blended fully-loaded hourly cost. Lower this
            if you want a conservative case; raise it to see an upside case.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-ink-500">AI investment</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">${totals.investment.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-ink-500">Est. annual productivity value</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">${totals.annualValue.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card className="border-brand-200 bg-brand-50">
          <CardBody>
            <p className="text-xs text-brand-700">Estimated ROI</p>
            <p className="mt-1 text-2xl font-semibold text-brand-800">{totals.roi}%</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="ROI by workflow" />
        <CardBody className="divide-y divide-ink-100 p-0">
          {workflows.map((w) => (
            <div key={w.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-ink-800">{w.label}</span>
              <span className="text-sm font-semibold text-ink-900">
                ${Math.round(w.annualValue * multiplier / 1000)}k/yr
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
