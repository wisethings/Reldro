import { ProductUpdateForm } from "@/components/platform-admin/ProductUpdateForm";

export default function ProductUpdatesPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-ink-900">Product updates</h1>
      <p className="mt-1 text-sm text-ink-600">Send a one-off announcement to customers or leads.</p>
      <div className="mt-6">
        <ProductUpdateForm />
      </div>
    </div>
  );
}
