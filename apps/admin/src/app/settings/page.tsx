"use client";

import { useEffect, useState } from "react";
import { adminRequest } from "../../lib/adminApi";
import { useToast } from "@eyeonchess/ui";
import { Skeleton } from "@eyeonchess/ui";

interface Settings {
  siteName: string;
  registrationOpen: boolean;
  maxUsers: number;
  requireEmailVerification: boolean;
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminRequest("get", "/api/v1/admin/settings")
      .then((data) => setSettings(data.settings))
      .catch(() => toast.show("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await adminRequest("put", "/api/v1/admin/settings", settings);
      setSettings(data.settings);
      toast.show("Settings saved");
    } catch {
      toast.show("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Site Settings</h1>
        <div className="space-y-4 max-w-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return <p className="text-red-400">Failed to load settings.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      <div className="max-w-lg space-y-6">
        {/* Site Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Site Name</label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            maxLength={100}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Display name shown to users (white-label)</p>
        </div>

        {/* Registration */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400">Registration</h2>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm">Open Registration</p>
              <p className="text-xs text-gray-500">Allow new users to register</p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  registrationOpen: !settings.registrationOpen,
                })
              }
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.registrationOpen ? "bg-green-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  settings.registrationOpen ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div>
            <label className="block text-sm mb-1">Max Users</label>
            <input
              type="number"
              min={0}
              value={settings.maxUsers}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxUsers: parseInt(e.target.value) || 0,
                })
              }
              className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
          </div>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm">Require Email Verification</p>
              <p className="text-xs text-gray-500">Users must be manually verified before login</p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  requireEmailVerification: !settings.requireEmailVerification,
                })
              }
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.requireEmailVerification ? "bg-green-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  settings.requireEmailVerification ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
