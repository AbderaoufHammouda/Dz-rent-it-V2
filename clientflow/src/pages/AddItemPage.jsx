import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Upload, X, Image, DollarSign,
  Calendar, FileText, Tag, ChevronRight,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import useItems from '../hooks/useItems';
import { categories } from '../data/mockData';
import { formatPrice } from '../utils/pricing';
import { validateItemForm } from '../utils/validation';

const steps = [
  { id: 1, title: 'Basic Info', icon: FileText },
  { id: 2, title: 'Category', icon: Tag },
  { id: 3, title: 'Photos', icon: Image },
  { id: 4, title: 'Pricing', icon: DollarSign },
  { id: 5, title: 'Availability', icon: Calendar },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-10">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{
                scale: currentStep === step.id ? 1.1 : 1,
              }}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300
                ${currentStep > step.id
                  ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow'
                  : currentStep === step.id
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'bg-gray-100 dark:bg-dark-50 text-gray-400'
                }
              `}
            >
              {currentStep > step.id ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
            </motion.div>
            <span className={`text-xs mt-1.5 font-medium hidden sm:block ${
              currentStep >= step.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'
            }`}>
              {step.title}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-1 rounded-full transition-all ${
              currentStep > step.id ? 'bg-brand-500' : 'bg-gray-200 dark:bg-dark-50'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AddItemPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { createItem, loading } = useItems();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    photos: [],
    price: '',
    deposit: '',
    condition: 'excellent',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.title.trim() && formData.description.trim();
      case 2: return formData.category;
      case 3: return true; // Photos optional for demo
      case 4: return formData.price;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
    else {
      // Validate all steps before submit
      const formPayload = {
        title: formData.title,
        description: formData.description,
        condition: formData.condition,
        categoryId: formData.category,
        price: Number(formData.price),
        deposit: Number(formData.deposit),
      };
      for (const step of [1, 2, 4]) {
        const result = validateItemForm(step, formPayload);
        if (!result.valid) {
          addToast(result.errors[0], 'error');
          return;
        }
      }

      try {
        await createItem({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          images: formData.photos,
          price: Number(formData.price),
          deposit: Number(formData.deposit),
          condition: formData.condition,
          availableDays: formData.availableDays,
          ownerId: user?.id,
        });
        addToast('Item listed successfully! It will be visible to renters shortly.', 'success', 6000);
        navigate('/dashboard');
      } catch (err) {
        addToast(err.message || 'Failed to create listing', 'error');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const addPhoto = () => {
    const placeholders = [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    ];
    if (formData.photos.length < 6) {
      update('photos', [...formData.photos, placeholders[formData.photos.length % 3]]);
      addToast('Photo added!', 'success');
    }
  };

  const removePhoto = (index) => {
    update('photos', formData.photos.filter((_, i) => i !== index));
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark pb-20">
        <div className="section pt-8 pb-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
                List Your Item
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Start earning from the things you own. It only takes a few minutes.
              </p>
            </div>

            {/* Step Indicator */}
            <StepIndicator currentStep={currentStep} />

            {/* Form Content */}
            <div className="card p-6 md:p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
                    <Input
                      label="Item Title"
                      placeholder="e.g., Sony A7 IV Camera Kit"
                      value={formData.title}
                      onChange={(e) => update('title', e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                      <textarea
                        placeholder="Describe your item, its condition, and what's included..."
                        value={formData.description}
                        onChange={(e) => update('description', e.target.value)}
                        rows={5}
                        className="input-base resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
                      <div className="flex flex-wrap gap-2">
                        {['excellent', 'like-new', 'good', 'fair'].map((c) => (
                          <button
                            key={c}
                            onClick={() => update('condition', c)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              formData.condition === c
                                ? 'bg-brand-500 text-white shadow-glow'
                                : 'bg-gray-100 dark:bg-dark-50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-50'
                            }`}
                          >
                            {c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Category */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Category</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose the category that best describes your item</p>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => update('category', cat.id)}
                          className={`
                            p-4 rounded-2xl text-left transition-all border
                            ${formData.category === cat.id
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-glow'
                              : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-50 hover:border-gray-300 dark:hover:border-gray-600'
                            }
                          `}
                        >
                          <h3 className={`font-semibold text-sm ${
                            formData.category === cat.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {cat.name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">{cat.count} items listed</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Photos */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Photos</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">High-quality photos help your item rent faster (max 6)</p>

                    <div className="grid grid-cols-3 gap-3">
                      {formData.photos.map((photo, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative aspect-square rounded-xl overflow-hidden group"
                        >
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {i === 0 && (
                            <span className="absolute bottom-2 left-2 badge bg-black/60 text-white text-xs border-0">Cover photo</span>
                          )}
                        </motion.div>
                      ))}
                      {formData.photos.length < 6 && (
                        <button
                          onClick={addPhoto}
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-brand-400 dark:hover:border-brand-500 transition-colors flex flex-col items-center justify-center gap-2"
                        >
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-xs text-gray-400">Add photo</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Pricing */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Set Your Price</h2>
                    <Input
                      label="Price per day (DA)"
                      type="number"
                      placeholder="e.g., 45"
                      value={formData.price}
                      onChange={(e) => update('price', e.target.value)}
                      icon={DollarSign}
                    />
                    <Input
                      label="Security deposit (DA)"
                      type="number"
                      placeholder="e.g., 200"
                      value={formData.deposit}
                      onChange={(e) => update('deposit', e.target.value)}
                      icon={DollarSign}
                    />
                    {formData.price && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20"
                      >
                        <h4 className="text-sm font-semibold text-brand-700 dark:text-brand-300 mb-2">Earning estimate</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">If rented 10 days/month</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(formData.price * 10)}/month</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">If rented 20 days/month</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(formData.price * 20)}/month</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 5: Availability */}
                {currentStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Availability</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select which days your item is available for rent</p>

                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <button
                          key={day}
                          onClick={() => {
                            if (formData.availableDays.includes(day)) {
                              update('availableDays', formData.availableDays.filter((d) => d !== day));
                            } else {
                              update('availableDays', [...formData.availableDays, day]);
                            }
                          }}
                          className={`
                            w-14 h-14 rounded-xl text-sm font-medium transition-all
                            ${formData.availableDays.includes(day)
                              ? 'bg-brand-500 text-white shadow-glow'
                              : 'bg-gray-100 dark:bg-dark-50 text-gray-600 dark:text-gray-400'
                            }
                          `}
                        >
                          {day}
                        </button>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="p-5 rounded-xl bg-gray-50 dark:bg-dark-50 border border-gray-200 dark:border-dark-border space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Listing Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Title</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formData.title || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Category</span>
                          <span className="font-medium text-gray-900 dark:text-white capitalize">{formData.category || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Price per day</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formData.price ? formatPrice(Number(formData.price)) : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Photos</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formData.photos.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Available days</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formData.availableDays.length}/7</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-dark-border">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  icon={ArrowLeft}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                >
                  {currentStep === 5 ? (loading ? 'Publishing...' : 'Publish Listing') : 'Continue'}
                  {currentStep < 5 && <ArrowRight className="w-4 h-4 ml-1" />}
                  {currentStep === 5 && <Check className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
