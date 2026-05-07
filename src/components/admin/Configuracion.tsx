import { useState } from 'react';
import { Settings, Save, AlertCircle, Check } from 'lucide-react';
import { useApp } from '../../AppContext';

export default function Configuracion() {
  const { configuracion, updateConfiguracion } = useApp();
  const [formData, setFormData] = useState(configuracion);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    
    // Validar en tiempo real
    const newErrors = { ...errors };
    
    if (field === 'comision_plataforma_pct' || field === 'pago_masajista_pct') {
      const comision = field === 'comision_plataforma_pct' ? value : formData.comision_plataforma_pct;
      const pago = field === 'pago_masajista_pct' ? value : formData.pago_masajista_pct;
      
      if (comision + pago !== 100) {
        newErrors.porcentajes = 'La suma de comisión y pago debe ser 100%';
      } else {
        delete newErrors.porcentajes;
      }
    }
    
    setErrors(newErrors);
  };

  const handleSave = () => {
    // Validación final
    if (formData.comision_plataforma_pct + formData.pago_masajista_pct !== 100) {
      setErrors({ porcentajes: 'La suma de comisión y pago debe ser 100%' });
      return;
    }

    if (formData.precio_maximo_sesion <= 0) {
      setErrors({ precio: 'El precio máximo debe ser mayor a 0' });
      return;
    }

    setSaving(true);
    updateConfiguracion(formData);
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={28} />
          Configuración del Sistema
        </h2>
        <p className="text-gray-600 mt-1">Gestiona las variables de negocio de MassFlow</p>
      </div>

      {/* Alerta de cambios pendientes */}
      {!saved && JSON.stringify(formData) !== JSON.stringify(configuracion) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-yellow-600" />
            <p className="text-sm text-yellow-900">
              <strong>Tienes cambios sin guardar.</strong> Haz clic en "Guardar Configuración" para aplicarlos.
            </p>
          </div>
        </div>
      )}

      {/* Confirmación guardado */}
      {saved && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div className="flex items-center gap-2">
            <Check size={20} className="text-green-600" />
            <p className="text-sm text-green-900">
              <strong>Configuración guardada correctamente.</strong> Los cambios se aplicarán inmediatamente.
            </p>
          </div>
        </div>
      )}

      {/* Distribución de Ingresos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Ingresos</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comisión Plataforma (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={formData.comision_plataforma_pct}
                onChange={(e) => {
                  const comision = Number(e.target.value);
                  handleChange('comision_plataforma_pct', comision);
                  handleChange('pago_masajista_pct', 100 - comision);
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="w-20 text-right">
                <span className="text-2xl font-bold text-purple-600">{formData.comision_plataforma_pct}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Porcentaje que retiene la plataforma por cada sesión completada
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pago a Masajistas (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={formData.pago_masajista_pct}
                onChange={(e) => {
                  const pago = Number(e.target.value);
                  handleChange('pago_masajista_pct', pago);
                  handleChange('comision_plataforma_pct', 100 - pago);
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="w-20 text-right">
                <span className="text-2xl font-bold text-teal-600">{formData.pago_masajista_pct}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Porcentaje que reciben las masajistas por cada sesión completada
            </p>
          </div>

          {errors.porcentajes && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <p className="text-sm text-red-800">{errors.porcentajes}</p>
            </div>
          )}

          {/* Visualización */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <div className="text-sm text-gray-600 mb-2">Ejemplo con sesión de 60€:</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Comisión Plataforma</div>
                <div className="text-lg font-bold text-purple-600">
                  {Math.round(60 * formData.comision_plataforma_pct / 100)}€
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Pago Masajista</div>
                <div className="text-lg font-bold text-teal-600">
                  {Math.round(60 * formData.pago_masajista_pct / 100)}€
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Precios y Límites */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Precios y Límites</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio Máximo por Sesión (€)
            </label>
            <input
              type="number"
              value={formData.precio_maximo_sesion}
              onChange={(e) => handleChange('precio_maximo_sesion', Number(e.target.value))}
              min="1"
              step="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-lg font-semibold"
            />
            <p className="text-xs text-gray-500 mt-2">
              Los servicios no podrán superar este precio. Se usa para validación en el CRUD de servicios.
            </p>
          </div>

          {errors.precio && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <p className="text-sm text-red-800">{errors.precio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Ciclos de Pago */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ciclos de Pago a Masajistas</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Frecuencia de Transferencias
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => handleChange('ciclo_pago', 'semanal')}
                className={`flex-1 px-6 py-4 rounded-lg border-2 transition ${
                  formData.ciclo_pago === 'semanal'
                    ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-lg mb-1">Semanal</div>
                <div className="text-xs opacity-70">Cada 7 días</div>
              </button>
              <button
                onClick={() => handleChange('ciclo_pago', 'quincenal')}
                className={`flex-1 px-6 py-4 rounded-lg border-2 transition ${
                  formData.ciclo_pago === 'quincenal'
                    ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-lg mb-1">Quincenal</div>
                <div className="text-xs opacity-70">1-15 y 16-fin de mes</div>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Define cada cuánto tiempo se procesarán las transferencias a las masajistas
            </p>
          </div>
        </div>
      </div>

      {/* Presupuesto Marketing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing y Publicidad</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presupuesto Meta Ads (% del BAI)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="50"
                value={formData.presupuesto_meta_ads_pct}
                onChange={(e) => handleChange('presupuesto_meta_ads_pct', Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="w-20 text-right">
                <span className="text-2xl font-bold text-blue-600">{formData.presupuesto_meta_ads_pct}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Porcentaje del Beneficio Antes de Impuestos destinado a publicidad en Meta Ads
            </p>
          </div>

          {/* Ejemplo */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-900 mb-2">
              <strong>Ejemplo:</strong> Si el BAI mensual es 10,000€
            </div>
            <div className="text-lg font-bold text-blue-600">
              Presupuesto Meta Ads: {Math.round(10000 * formData.presupuesto_meta_ads_pct / 100)}€/mes
            </div>
          </div>
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Moneda del sistema</span>
            <span className="font-semibold text-gray-900">{formData.moneda}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Versión de configuración</span>
            <span className="font-mono text-sm text-gray-500">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="sticky bottom-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !!Object.keys(errors).length || JSON.stringify(formData) === JSON.stringify(configuracion)}
          className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {saving ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={24} />
              Guardar Configuración
            </>
          )}
        </button>
      </div>
    </div>
  );
}
