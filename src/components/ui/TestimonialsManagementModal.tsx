"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { TestimonialItem, SEED_TESTIMONIALS } from "@/lib/public-directory";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Star,
  Globe,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

interface TestimonialsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestimonialsManagementModal({
  isOpen,
  onClose,
}: TestimonialsManagementModalProps) {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New testimonial form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newQuote, setNewQuote] = useState("");
  const [newRating, setNewRating] = useState(5);

  // Editing existing testimonial
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editQuote, setEditQuote] = useState("");
  const [editRating, setEditRating] = useState(5);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/testimonials");
      const json = await res.json();
      if (json.success && Array.isArray(json.testimonials)) {
        setTestimonials(json.testimonials);
      } else {
        setTestimonials(SEED_TESTIMONIALS);
      }
    } catch {
      setTestimonials(SEED_TESTIMONIALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTestimonials();
      setMessage(null);
      setShowAddForm(false);
      setEditingId(null);
    }
  }, [isOpen]);

  const saveTestimonialsList = async (newList: TestimonialItem[], successNotice: string) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/v1/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testimonials: newList }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update testimonials");
      }
      setTestimonials(newList);
      setMessage({ text: successNotice, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save testimonials", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newQuote.trim()) {
      setMessage({ text: "Name and Quote are required.", type: "error" });
      return;
    }

    const newItem: TestimonialItem = {
      id: `t_${Date.now()}`,
      n: newName.trim(),
      c: newCity.trim() || "Global",
      q: newQuote.trim(),
      rating: newRating,
      status: "live",
    };

    const updated = [newItem, ...testimonials];
    await saveTestimonialsList(updated, "New testimonial added successfully!");
    setNewName("");
    setNewCity("");
    setNewQuote("");
    setNewRating(5);
    setShowAddForm(false);
  };

  const handleStartEdit = (t: TestimonialItem) => {
    setEditingId(t.id);
    setEditName(t.n);
    setEditCity(t.c);
    setEditQuote(t.q);
    setEditRating(t.rating || 5);
  };

  const handleSaveEdit = async (id: string) => {
    const updated = testimonials.map((item) =>
      item.id === id
        ? {
            ...item,
            n: editName.trim(),
            c: editCity.trim(),
            q: editQuote.trim(),
            rating: editRating,
          }
        : item
    );
    await saveTestimonialsList(updated, "Testimonial updated successfully!");
    setEditingId(null);
  };

  const handleToggleStatus = async (id: string) => {
    const updated = testimonials.map((item) =>
      item.id === id
        ? { ...item, status: (item.status === "draft" ? "live" : "draft") as "live" | "draft" }
        : item
    );
    await saveTestimonialsList(updated, "Status updated.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    const updated = testimonials.filter((item) => item.id !== id);
    await saveTestimonialsList(updated, "Testimonial deleted.");
  };

  const handleResetToSeeds = async () => {
    if (!confirm("Reset testimonials back to original verified seeds?")) return;
    await saveTestimonialsList(SEED_TESTIMONIALS, "Reset to default testimonials.");
  };

  const liveCount = testimonials.filter((t) => t.status !== "draft").length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Client Testimonials & Stories"
      description="Manage reviews shown on the Public Calculators Hub dual-track live marquee (#stories)."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Banner with stats and add button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Marquee Stories
              </div>
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>{testimonials.length} Total</span>
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {liveCount} Active
                </span>
                {testimonials.length - liveCount > 0 && (
                  <span className="text-slate-500 font-medium text-xs bg-slate-200/70 px-2 py-0.5 rounded-full">
                    {testimonials.length - liveCount} Draft
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#F1C819]" />
              <span>{showAddForm ? "Cancel Add" : "Add Testimonial"}</span>
            </button>
            <button
              type="button"
              onClick={handleResetToSeeds}
              disabled={saving}
              title="Reset to 14 verified client seed reviews"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status notice */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {message.type === "success" ? <Check className="w-4 h-4 text-emerald-600" /> : null}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in duration-150"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Add New Client Story</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frankfurt, Germany"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Rating
                </label>
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
                  <option value={3}>⭐⭐⭐ 3 Stars</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Client Review Quote <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Write the verified feedback or quote here..."
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-[#00215C] hover:bg-[#255CC1] text-white font-bold text-xs rounded-lg transition"
              >
                {saving ? "Publishing..." : "Save Testimonial"}
              </button>
            </div>
          </form>
        )}

        {/* Testimonials List */}
        <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">
              Loading testimonials...
            </div>
          ) : testimonials.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No testimonials found. Click &quot;Add Testimonial&quot; to publish one.
            </div>
          ) : (
            testimonials.map((t) => {
              const isEditing = editingId === t.id;
              const isLive = t.status !== "draft";

              if (isEditing) {
                return (
                  <div
                    key={t.id}
                    className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border rounded-lg"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border rounded-lg"
                        placeholder="City"
                      />
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="px-2.5 py-1.5 text-xs bg-white border rounded-lg"
                      >
                        <option value={5}>5 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={3}>3 Stars</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={editQuote}
                      onChange={(e) => setEditQuote(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(t.id)}
                        disabled={saving}
                        className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isLive
                      ? "bg-white border-slate-200/80 shadow-2xs"
                      : "bg-slate-50 border-dashed border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-black text-slate-900">{t.n}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{t.c}</span>
                      <span className="text-[10px] text-amber-500">
                        {"★".repeat(t.rating || 5)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(t.id)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition ${
                          isLive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300"
                        }`}
                        title={isLive ? "Click to pause/draft" : "Click to publish live"}
                      >
                        {isLive ? "Live" : "Draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(t)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                        title="Edit testimonial"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete testimonial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-700 italic line-clamp-2 leading-relaxed">
                    &ldquo;{t.q}&rdquo;
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Updates sync live across the Public Calculators Hub</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
