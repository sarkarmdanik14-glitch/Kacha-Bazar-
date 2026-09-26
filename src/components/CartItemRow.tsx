import React, { useState, useEffect, useRef } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { CartItem, ProductOption } from "../types";
import { 
  getProductWeightOptions, 
  getWeightOnlyLabel, 
  calculateProductPriceForWeight, 
  validateWeightLimit 
} from "../lib/productWeightUtils";
import { SAFE_PRODUCT_PLACEHOLDER } from "../lib/masterImageRegistry";

interface CartItemRowProps {
  item: CartItem;
  itemIndex: number;
  lang: "bn" | "en";
  fmtNum: (n: number | string) => string;
  onUpdateOption: (itemIndex: number, newOption: ProductOption) => void;
  onRemove: (productId: string, selectedOption?: ProductOption) => void;
  handleProductImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  itemIndex,
  lang,
  fmtNum,
  onUpdateOption,
  onRemove,
  handleProductImgError,
}) => {
  const isFocusedRef = useRef<boolean>(false);
  const availableOptions = getProductWeightOptions(item.product);
  const currentOpt = item.selectedOption || availableOptions.find(o => o.price === item.product.price) || availableOptions[0];
  
  // Check if current option is custom or liquid/kg
  const isCurrentlyCustom = Boolean(
    currentOpt?.isCustom || 
    (currentOpt && !availableOptions.some(o => o.value === currentOpt.value && o.unit === currentOpt.unit))
  );

  const [isCustomMode, setIsCustomMode] = useState<boolean>(isCurrentlyCustom);
  const [customValue, setCustomValue] = useState<string>(
    currentOpt ? String(currentOpt.value) : "500"
  );
  const [customUnit, setCustomUnit] = useState<string>(
    currentOpt ? currentOpt.unit : (availableOptions[0]?.unit || "g")
  );

  // Sync state only if external item changes and user is NOT actively typing
  useEffect(() => {
    if (currentOpt) {
      const isCustom = Boolean(
        currentOpt.isCustom || 
        !availableOptions.some(o => o.value === currentOpt.value && o.unit === currentOpt.unit)
      );
      setIsCustomMode(isCustom);
      if (!isFocusedRef.current) {
        setCustomValue(String(currentOpt.value));
        setCustomUnit(currentOpt.unit);
      }
    }
  }, [currentOpt?.value, currentOpt?.unit, currentOpt?.isCustom]);

  // Validation
  const normalizedNum = customValue.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
  const numVal = parseFloat(normalizedNum);
  const validation = validateWeightLimit(numVal, customUnit);
  const isCustomInvalid = isCustomMode && !validation.isValid;

  const itemPrice = isCustomMode && validation.isValid
    ? calculateProductPriceForWeight(item.product, numVal, customUnit)
    : (currentOpt ? currentOpt.price : item.product.price);

  const optStock = typeof currentOpt?.stock === "number" 
    ? currentOpt.stock 
    : (typeof item.product.stock === "number" ? item.product.stock : 50);
  const isItemOutOfStock = optStock <= 0 || item.product.isAvailable === false || (typeof item.product.stock === "number" && item.product.stock <= 0);

  // Handle standard option selection from dropdown
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "CUSTOM_OPTION") {
      setIsCustomMode(true);
      const defaultUnit = availableOptions.some(o => o.unit === "kg" || o.unit === "g") ? "g" : (availableOptions[0]?.unit || "g");
      const defaultVal = defaultUnit === "g" ? "750" : "1";
      setCustomValue(defaultVal);
      setCustomUnit(defaultUnit);
      
      const calcPrice = calculateProductPriceForWeight(item.product, parseFloat(defaultVal), defaultUnit);
      onUpdateOption(itemIndex, {
        value: parseFloat(defaultVal),
        unit: defaultUnit,
        price: calcPrice,
        stock: optStock,
        isCustom: true
      });
    } else {
      setIsCustomMode(false);
      const [valStr, unitStr] = val.split("::");
      const selected = availableOptions.find(o => String(o.value) === valStr && o.unit === unitStr);
      if (selected) {
        onUpdateOption(itemIndex, selected);
      }
    }
  };

  // Handle custom value input
  const handleCustomValueChange = (valStr: string) => {
    setCustomValue(valStr);
    const normalized = valStr.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
    const parsed = parseFloat(normalized);
    const validCheck = validateWeightLimit(parsed, customUnit);
    
    if (validCheck.isValid) {
      const calcPrice = calculateProductPriceForWeight(item.product, parsed, customUnit);
      onUpdateOption(itemIndex, {
        value: parsed,
        unit: customUnit,
        price: calcPrice,
        stock: optStock,
        isCustom: true
      });
    } else {
      onUpdateOption(itemIndex, {
        value: isNaN(parsed) ? 0 : parsed,
        unit: customUnit,
        price: calculateProductPriceForWeight(item.product, 1, customUnit),
        stock: optStock,
        isCustom: true
      });
    }
  };

  // Handle custom unit toggle
  const handleCustomUnitChange = (unitStr: string) => {
    setCustomUnit(unitStr);
    const normalized = customValue.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
    const parsed = parseFloat(normalized);
    const validCheck = validateWeightLimit(parsed, unitStr);
    const valForCalc = validCheck.isValid ? parsed : 1;
    const calcPrice = calculateProductPriceForWeight(item.product, valForCalc, unitStr);
    
    onUpdateOption(itemIndex, {
      value: isNaN(parsed) ? 0 : parsed,
      unit: unitStr,
      price: calcPrice,
      stock: optStock,
      isCustom: true
    });
  };

  // Switch back to preset list
  const handleSwitchToPreset = () => {
    setIsCustomMode(false);
    const firstOpt = availableOptions[0];
    if (firstOpt) {
      onUpdateOption(itemIndex, firstOpt);
    }
  };

  const isLiquid = availableOptions.some(o => o.unit === "L" || o.unit === "ml");
  const isWeight = availableOptions.some(o => o.unit === "kg" || o.unit === "g");

  return (
    <div className="bg-slate-50/80 hover:bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 relative transition-all">
      
      {/* Top row: Product image, name & Delete button */}
      <div className="flex gap-2 items-center">
        <img 
          src={item.product.image || (item.product as any).imageUrl || SAFE_PRODUCT_PLACEHOLDER} 
          className="w-10 h-10 sm:w-11 sm:h-11 object-cover rounded-lg shrink-0 bg-white border border-slate-100" 
          onError={handleProductImgError} 
          alt={item.product.nameEn}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-800 truncate pr-1.5 leading-tight">
              {lang === "bn" ? item.product.nameBn : item.product.nameEn}
            </h4>
            <button 
              onClick={() => onRemove(item.product.id, item.selectedOption)}
              className="text-slate-400 hover:text-red-500 transition shrink-0 p-1 cursor-pointer rounded hover:bg-red-50"
              title={lang === "bn" ? "মুছে ফেলুন" : "Remove"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Out of stock error alert */}
          {isItemOutOfStock && (
            <div className="mt-0.5 text-[9.5px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
              <span>⚠️</span>
              <span>{lang === "bn" ? "পর্যাপ্ত স্টক নেই" : "Out of Stock"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Weight selection Box (Left) and Price Box (Right) on the SAME LINE */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
        
        {/* LEFT BOX: Weight / Quantity Selection */}
        <div className="flex-1 min-w-0">
          {!isCustomMode ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] text-slate-600 font-bold shrink-0">
                {lang === "bn" ? "পরিমাণ:" : "Qty:"}
              </span>
              
              <div className="relative flex-1 min-w-0">
                <select
                  value={currentOpt ? `${currentOpt.value}::${currentOpt.unit}` : ""}
                  onChange={handleDropdownChange}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs truncate leading-tight"
                >
                  {availableOptions.map((opt, oIdx) => (
                    <option key={oIdx} value={`${opt.value}::${opt.unit}`}>
                      {getWeightOnlyLabel(opt, lang, fmtNum)}
                    </option>
                  ))}
                  <option value="CUSTOM_OPTION">
                    {lang === "bn" ? "✏️ কাস্টম (Custom)" : "✏️ Custom"}
                  </option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-bold shrink-0">
                  {lang === "bn" ? "ওজন:" : "Weight:"}
                </span>

                {/* Custom input with continuous typing support & unit toggle */}
                <div className={`flex items-center gap-1 flex-1 min-w-0 bg-white border rounded-lg p-0.5 shadow-2xs ${
                  isCustomInvalid 
                    ? "border-rose-400 ring-1 ring-rose-300" 
                    : "border-slate-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
                }`}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={customUnit === "g" ? "৩৫০" : "১.৫"}
                    value={customValue}
                    onFocus={() => {
                      isFocusedRef.current = true;
                    }}
                    onBlur={() => {
                      isFocusedRef.current = false;
                      const normalized = customValue.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
                      const parsed = parseFloat(normalized);
                      if (!isNaN(parsed) && parsed > 0) {
                        setCustomValue(String(parsed));
                      }
                    }}
                    onChange={(e) => handleCustomValueChange(e.target.value)}
                    className="w-full min-w-[40px] px-1.5 py-0.5 text-[11px] font-bold text-slate-800 outline-none bg-transparent"
                  />

                  {/* Unit Selector */}
                  <select
                    value={customUnit}
                    onChange={(e) => handleCustomUnitChange(e.target.value)}
                    className="bg-slate-100 text-slate-700 text-[10px] font-bold rounded px-1 py-0.5 border-none outline-none cursor-pointer shrink-0"
                  >
                    {isLiquid ? (
                      <>
                        <option value="ml">{lang === "bn" ? "মিলি" : "ml"}</option>
                        <option value="L">{lang === "bn" ? "লিটার" : "L"}</option>
                      </>
                    ) : isWeight ? (
                      <>
                        <option value="g">{lang === "bn" ? "গ্রাম" : "g"}</option>
                        <option value="kg">{lang === "bn" ? "কেজি" : "kg"}</option>
                      </>
                    ) : (
                      <option value={availableOptions[0]?.unit || "unit"}>
                        {availableOptions[0]?.unit || "unit"}
                      </option>
                    )}
                  </select>
                </div>

                {/* Switch back to presets button */}
                <button
                  type="button"
                  onClick={handleSwitchToPreset}
                  className="px-1.5 py-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition border border-slate-200 hover:border-emerald-200 cursor-pointer shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                  title={lang === "bn" ? "তালিকায় ফিরুন" : "Switch to preset weights"}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">{lang === "bn" ? "ড্রপডাউন" : "Presets"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT BOX: Dedicated Price Box (Beside Weight Box on the same line) */}
        <div className="shrink-0 flex items-center gap-1.5">
          <span className="text-[10px] sm:text-[11px] text-slate-600 font-bold shrink-0">
            {lang === "bn" ? "দাম:" : "Price:"}
          </span>
          <div className={`font-black text-xs px-2 py-0.5 rounded-lg shadow-2xs min-w-[52px] text-center border ${
            isCustomInvalid
              ? "bg-rose-50 border-rose-300 text-rose-700"
              : "bg-emerald-50 border-emerald-300 text-emerald-700"
          }`}>
            ৳{fmtNum(itemPrice)}
          </div>
        </div>

      </div>

      {/* Validation alert message if Custom weight is invalid (0 or empty) */}
      {isCustomInvalid && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg animate-in fade-in">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{lang === "bn" ? validation.errorMsgBn : validation.errorMsgEn}</span>
        </div>
      )}

    </div>
  );
};
