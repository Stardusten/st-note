import { Search } from "lucide-solid"
import { TextField, TextFieldInput } from "../solidui/text-field"

const SearchInput = () => {
  return (
    <TextField class="relative flex items-center">
      <Search class="size-4 stroke-[1.5] absolute left-2 text-muted-foreground/50" />
      <TextFieldInput
        class="h-[28px] w-[200px] rounded-full indent-4"
        placeholder="Find, create or ask AI"
      />
    </TextField>
  )
}

export default SearchInput
