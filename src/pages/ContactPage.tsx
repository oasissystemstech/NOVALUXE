import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Send,
  CheckCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { TikTokIcon } from '../components/TikTokIcon';
import { store } from '../lib/store';

export const ContactPage: React.FC = () => {
  const { settings } = useSettings();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !message.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      store.createEnquiry({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        subject: subject.trim() || 'General Product Enquiry',
        message: message.trim()
      });

      setIsSubmitting(false);
      setSubmitted(true);
      setFullName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Page Header */}
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F3EFEA]">
          Contact NOVALUXE
        </h1>
        <p className="text-sm text-[#C5B9D8] leading-relaxed">
          Have a question about our products or your order? Get in touch with NOVALUXE. We're happy to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Form Left */}
        <div className="lg:col-span-7">
          <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-8 sm:p-10 space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#F3EFEA]">
                Send an Enquiry
              </h2>
              <p className="text-xs text-[#9C8EB2] mt-1">
                Fill in the details below and our team will get back to you promptly.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-center space-y-3 animate-in fade-in">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-semibold text-[#F3EFEA]">
                  Thank you for reaching out!
                </h3>
                <p className="text-xs text-[#C5B9D8]">
                  Your message has been received by our Monrovia team. If you require immediate assistance, feel free to tap our WhatsApp button below.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-3 px-5 py-2 rounded-xl bg-[#1A1227] text-xs font-semibold text-[#F5D061] border border-[#34244C]"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#C5B9D8]">
                      Full Name <span className="text-[#F5D061]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Marie Cooper"
                      className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#C5B9D8]">
                      Phone Number <span className="text-[#F5D061]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. +231 88 851 8375"
                      className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#C5B9D8]">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#C5B9D8]">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Product availability or order inquiry"
                      className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#C5B9D8]">
                    Your Message <span className="text-[#F5D061]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us what you'd like to ask or let us know which items you need..."
                    className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] hover:opacity-95 text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Official Information Right */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Direct WhatsApp Card */}
          <div className="bg-gradient-to-br from-[#16271C] via-[#101D15] to-[#0A120D] rounded-3xl border border-[#235835] p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#F3EFEA]">Direct WhatsApp</h3>
                <p className="text-xs text-[#25D366] font-medium">Fastest Response Time</p>
              </div>
            </div>

            <p className="text-xs text-[#C5B9D8] leading-relaxed">
              Connect directly with our store team for instant product advice, shade matching, stock checks, or custom order requests.
            </p>

            <a
              href={`https://wa.me/${settings.whatsappRaw}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-[#0A0710] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp: {settings.whatsapp}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Official Location & Contact Cards */}
          <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-serif font-bold text-[#F3EFEA] uppercase tracking-wider border-b border-[#261B36] pb-3">
              Store Information
            </h3>

            <div className="space-y-4 text-xs text-[#C5B9D8]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F5D061] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#F3EFEA]">Store Location</p>
                  <p>{settings.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#A855F7] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#F3EFEA]">Phone Numbers</p>
                  {settings.phoneNumbers.map((num, i) => (
                    <p key={i}>
                      <a href={`tel:${num.replace(/\s+/g, '')}`} className="hover:text-[#F5D061] transition-colors">
                        {num}
                      </a>
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#A855F7] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#F3EFEA]">Official Email</p>
                  <a href={`mailto:${settings.email}`} className="hover:text-[#F5D061] transition-colors">
                    {settings.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Social channels */}
            <div className="pt-4 border-t border-[#261B36] space-y-3">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#9C8EB2]">
                Official Social Channels
              </p>
              <div className="flex gap-3">
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#1A1227] hover:bg-[#251A38] text-[#F3EFEA] border border-[#34244C] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Instagram className="w-4 h-4 text-[#E1306C]" />
                  <span>Instagram</span>
                </a>
                <a
                  href={settings.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#1A1227] hover:bg-[#251A38] text-[#F3EFEA] border border-[#34244C] hover:border-[#00F2EA]/40 text-xs font-medium flex items-center justify-center gap-2 transition-all group"
                >
                  <TikTokIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>TikTok</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
