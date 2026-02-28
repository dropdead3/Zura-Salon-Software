import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AiWriteButton, type AiFieldType } from './AiWriteButton';

interface CharCountInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  description?: string;
  className?: string;
  id?: string;
  aiFieldType?: AiFieldType;
}

export function CharCountInput({
  label,
  value,
  onChange,
  maxLength = 60,
  placeholder,
  description,
  className,
  id,
  aiFieldType,
}: CharCountInputProps) {
  const length = value.length;
  const isOver = length > maxLength;
  const isNear = length > maxLength * 0.85;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
          {aiFieldType && (
            <AiWriteButton
              fieldType={aiFieldType}
              onAccept={onChange}
              currentValue={value}
              maxLength={maxLength}
            />
          )}
        </div>
        <span className={cn(
          "text-[10px] font-mono tabular-nums",
          isOver ? "text-destructive" : isNear ? "text-[hsl(var(--platform-warning))]" : "text-muted-foreground"
        )}>
          {length}/{maxLength}
        </span>
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(isOver && "border-destructive")}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
