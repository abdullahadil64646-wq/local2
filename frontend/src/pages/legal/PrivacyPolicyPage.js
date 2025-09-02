import React from 'react';
import { Link } from 'react-router-dom';
import { DocumentTextIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 px-6 py-8">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-white mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
                <p className="text-green-100 mt-2">Your privacy is important to us</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="prose max-w-none">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>Last updated:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                <p className="text-gray-600 leading-relaxed">
                  Welcome to our Grocery Store Platform ("we," "our," or "us"). This Privacy Policy explains how we collect, 
                  use, disclose, and safeguard your information when you use our online grocery delivery service, 
                  including our website and mobile applications.
                </p>
                <p className="text-gray-600 leading-relaxed mt-4">
                  We are committed to protecting your privacy and ensuring the security of your personal information. 
                  By using our services, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>Name, email address, and phone number</li>
                  <li>Delivery addresses and contact preferences</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Order history and preferences</li>
                  <li>Account credentials and profile information</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Automatically Collected Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, clicks)</li>
                  <li>Location data (for delivery services)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><strong>Order Processing:</strong> To process and deliver your grocery orders</li>
                  <li><strong>Payment Processing:</strong> To handle payments and billing through JazzCash, Easypaisa, or cash on delivery</li>
                  <li><strong>Communication:</strong> To send order confirmations, delivery updates, and customer support</li>
                  <li><strong>Personalization:</strong> To recommend products based on your preferences and purchase history</li>
                  <li><strong>Delivery Services:</strong> To coordinate delivery through our partners (Bykea, TCS, Leopards)</li>
                  <li><strong>Analytics:</strong> To improve our services and user experience</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
                </p>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Service Providers</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li><strong>Delivery Partners:</strong> Bykea, TCS, Leopards (only delivery-related information)</li>
                  <li><strong>Payment Processors:</strong> JazzCash, Easypaisa, Stripe (only payment-related information)</li>
                  <li><strong>Technology Partners:</strong> Cloud storage, analytics, and communication services</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Legal Requirements</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>When required by law or legal process</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>To prevent fraud or illegal activities</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We implement appropriate technical and organizational security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure payment processing through certified providers</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Access controls and authentication measures</li>
                  <li>Staff training on data protection best practices</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights and Choices</h2>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                  <li><strong>Marketing Opt-out:</strong> Unsubscribe from marketing communications</li>
                  <li><strong>Cookie Management:</strong> Manage cookie preferences through your browser</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
                <p className="text-gray-600 leading-relaxed">
                  We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. 
                  Specifically:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
                  <li>Account information: Until account deletion or 3 years of inactivity</li>
                  <li>Order history: 7 years for tax and legal purposes</li>
                  <li>Payment information: As required by payment processors and regulations</li>
                  <li>Marketing data: Until you opt out or 2 years of inactivity</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We use cookies and similar technologies to enhance your experience:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for website functionality</li>
                  <li><strong>Analytics Cookies:</strong> To understand how you use our service</li>
                  <li><strong>Marketing Cookies:</strong> To personalize ads and content</li>
                  <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-4">
                  You can manage cookie preferences through your browser settings, though some features may not work properly if cookies are disabled.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links</h2>
                <p className="text-gray-600 leading-relaxed">
                  Our service may contain links to third-party websites or services. We are not responsible for the privacy practices 
                  of these external sites. We encourage you to review their privacy policies before providing any personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
                <p className="text-gray-600 leading-relaxed">
                  Our services are not intended for children under 13 years of age. We do not knowingly collect personal information 
                  from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, 
                  please contact us to have it removed.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
                <p className="text-gray-600 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy 
                  on this page and updating the "Last updated" date. Significant changes will be communicated via email or prominent 
                  notices on our platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="text-gray-600 space-y-2">
                    <li><strong>Email:</strong> privacy@yourstore.com</li>
                    <li><strong>Phone:</strong> +92-XXX-XXXXXXX</li>
                    <li><strong>Address:</strong> Your Store Address, City, Pakistan</li>
                    <li><strong>Business Hours:</strong> Monday - Sunday, 8:00 AM - 10:00 PM</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
                <p className="text-gray-600 leading-relaxed">
                  This Privacy Policy is governed by the laws of Pakistan. Any disputes arising from this policy will be resolved 
                  in the courts of Pakistan, subject to applicable consumer protection laws.
                </p>
              </section>
            </div>

            {/* Navigation */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Link 
                  to="/terms" 
                  className="flex items-center text-green-600 hover:text-green-700 transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  View Terms & Conditions
                </Link>
                <Link 
                  to="/" 
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Back to Store
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;