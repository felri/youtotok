import TextareaAutosize from "react-textarea-autosize";

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TextArea({ value, onChange, placeholder }: TextAreaProps) {
  return (
    <div className=" w-full h-full overflow-scroll">
      <TextareaAutosize
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="p-2 border border-gray-300 w-full h-full max-h-[70vh] rounded-md"
        placeholder={placeholder || "Generate the subtitle..."}
      />
    </div>
  );
}

export default TextArea;
