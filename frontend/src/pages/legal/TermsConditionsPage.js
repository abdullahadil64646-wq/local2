import React from 'react';
import { Link } from 'react-router-dom';
import { DocumentTextIcon, ScaleIcon } from '@heroicons/react/24/outline';

const TermsConditionsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8">
            <div className="flex items-center">
              <ScaleIcon className="h-8 w-8 text-white mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-white">Terms & Conditions</h1>
                <p className="text-blue-100 mt-2">Please read these terms carefully before using our service</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="prose max-w-none">
              <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 text-sm">
                  <strong>Last updated:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  By accessing and using our grocery delivery platform ("Service"), you agree to be bound by these Terms and Conditions 
                  ("Terms"). If you disagree with any part of these terms, then you may not access the Service.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  These Terms apply to all visitors, users, and others who access or use the Service. Our Service is offered subject 
                  to your acceptance without modification of all terms, conditions, policies, and notices contained herein.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Our platform provides online grocery ordering and delivery services in Pakistan. We connect customers with local 
                  grocery stores and facilitate the purchase and delivery of fresh groceries, household items, and related products.
                </p>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Service Features</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Online grocery catalog and ordering system</li>
                  <li>Multiple payment options (Cash on Delivery, JazzCash, Easypaisa)</li>
                  <li>Delivery services through partner providers (Bykea, TCS, Leopards)</li>
                  <li>Order tracking and customer support</li>
                  <li>Account management and order history</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Account Creation</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>You must provide accurate, current, and complete information during registration</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You must be at least 18 years old to create an account</li>
                  <li>One account per person; multiple accounts are not permitted</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Responsibilities</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>You are responsible for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Keep your contact information and delivery addresses up to date</li>
                  <li>Use the Service only for lawful purposes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Orders and Payments</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Order Process</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>All orders are subject to availability and acceptance</li>
                  <li>We reserve the right to refuse or cancel any order at our discretion</li>
                  <li>Prices are subject to change without notice</li>
                  <li>Order confirmation does not guarantee product availability</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Payment Terms</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>Payment is required at the time of order placement (except COD)</li>
                  <li>We accept JazzCash, Easypaisa, and Cash on Delivery</li>
                  <li>All prices are in Pakistani Rupees (PKR) and include applicable taxes</li>
                  <li>Payment processing is handled by certified third-party providers</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Minimum Order and Delivery Charges</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Minimum order value: ₨500</li>
                  <li>Standard delivery fee: ₨150 (free on orders above ₨2000)</li>
                  <li>Express delivery fee: ₨300</li>
                  <li>Delivery charges may vary based on location and distance</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Delivery Policy</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Delivery Areas</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We currently deliver to major cities in Pakistan including Lahore, Karachi, Islamabad, Rawalpindi, 
                  Faisalabad, Multan, Gujranwala, Sialkot, Peshawar, and Quetta. Delivery availability may vary by specific area.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Delivery Times</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>Standard delivery: 2-4 hours</li>
                  <li>Express delivery: 30-60 minutes</li>
                  <li>Delivery times are estimates and may vary due to weather, traffic, or high demand</li>
                  <li>We operate from 8:00 AM to 10:00 PM daily</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Delivery Requirements</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Someone must be available to receive the delivery at the specified address</li>
                  <li>Valid identification may be required for delivery confirmation</li>
                  <li>For COD orders, exact payment amount should be ready</li>
                  <li>We are not responsible for orders delivered to incorrect addresses provided by customers</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Product Quality and Returns</h2>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Product Quality</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>We strive to provide fresh, high-quality products</li>
                  <li>Product images are for illustration purposes and may vary from actual products</li>
                  <li>We reserve the right to substitute items with similar quality products if unavailable</li>
                  <li>Perishable items should be consumed within recommended timeframes</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Returns and Refunds</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Returns are accepted for damaged, expired, or incorrect items</li>
                  <li>Return requests must be made within 24 hours of delivery</li>
                  <li>Refunds will be processed within 3-5 business days</li>
                  <li>Perishable items cannot be returned unless they are damaged or expired upon delivery</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Prohibited Uses</h2>
                <p className="text-gray-600 leading-relaxed mb-4">You may not use our Service:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>For any unlawful purpose or to solicit others to unlawful acts</li>
                  <li>To violate any international, federal, provincial, or local laws or regulations</li>
                  <li>To infringe upon or violate our intellectual property rights or the rights of others</li>
                  <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                  <li>To submit false or misleading information</li>
                  <li>To upload or transmit viruses or malicious code</li>
                  <li>To collect or track personal information of others</li>
                  <li>To spam, phish, or conduct similar activities</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  The Service and its original content, features, and functionality are and will remain the exclusive property 
                  of our company and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Our trademarks and trade dress may not be used without our written permission</li>
                  <li>You may not reproduce, distribute, modify, or create derivative works of our content</li>
                  <li>Product images and descriptions are provided by suppliers and may be protected by copyright</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Privacy Policy</h2>
                <p className="text-gray-600 leading-relaxed">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, 
                  to understand our practices regarding the collection, use, and disclosure of your personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  In no event shall our company, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                  be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, 
                  loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>We do not guarantee uninterrupted or error-free service</li>
                  <li>We are not liable for third-party delivery service issues</li>
                  <li>Maximum liability is limited to the amount paid for the specific order in question</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
                <p className="text-gray-600 leading-relaxed">
                  You agree to defend, indemnify, and hold harmless our company and its licensee and licensors, and their employees, 
                  contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, 
                  liabilities, costs or debt, and expenses (including but not limited to attorney's fees).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Termination</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, 
                  under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>You may terminate your account at any time by contacting customer support</li>
                  <li>Upon termination, your right to use the Service will cease immediately</li>
                  <li>All provisions which by their nature should survive termination shall survive</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
                <p className="text-gray-600 leading-relaxed">
                  These Terms shall be interpreted and governed by the laws of Pakistan, without regard to its conflict of law provisions. 
                  Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to Terms</h2>
                <p className="text-gray-600 leading-relaxed">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, 
                  we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will 
                  be determined at our sole discretion.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have any questions about these Terms and Conditions, please contact us:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="text-gray-600 space-y-2">
                    <li><strong>Email:</strong> support@yourstore.com</li>
                    <li><strong>Phone:</strong> +92-XXX-XXXXXXX</li>
                    <li><strong>Address:</strong> Your Store Address, City, Pakistan</li>
                    <li><strong>Business Hours:</strong> Monday - Sunday, 8:00 AM - 10:00 PM</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Acknowledgment</h2>
                <p className="text-gray-600 leading-relaxed">
                  By using our Service, you acknowledge that you have read these Terms and Conditions and agree to be bound by them. 
                  If you do not agree to these Terms, please do not use our Service.
                </p>
              </section>
            </div>

            {/* Navigation */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Link 
                  to="/privacy" 
                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  View Privacy Policy
                </Link>
                <Link 
                  to="/" 
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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

export default TermsConditionsPage;