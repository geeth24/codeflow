import inspect
import io
import sys
from typing import Any

ALLOWED_MODULES = {"math", "random"}


class TimeoutError(Exception):
    pass


def timeout_handler(signum, frame):
    raise TimeoutError("Execution timeout")


def serialize_value(value: Any, depth: int = 0, max_depth: int = 5, seen: set = None) -> Any:
    """
    Recursively serialize a Python value to JSON-compatible format.
    Handles class instances by extracting their __dict__ attributes.
    """
    if seen is None:
        seen = set()

    # Prevent infinite recursion
    if depth > max_depth:
        return "<max depth reached>"

    # Check for circular references
    obj_id = id(value)
    if obj_id in seen:
        return "<circular ref>"

    # Primitives
    if value is None:
        return None
    if isinstance(value, bool):  # Must check before int since bool is subclass of int
        return value
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return value[:200] if len(value) > 200 else value  # Truncate long strings

    # Add to seen set for complex objects
    seen.add(obj_id)

    try:
        # Lists and tuples
        if isinstance(value, (list, tuple)):
            result = []
            for i, item in enumerate(value[:20]):  # Limit to 20 items
                result.append(serialize_value(item, depth + 1, max_depth, seen.copy()))
            if len(value) > 20:
                result.append(f"... +{len(value) - 20} more")
            return result

        # Dictionaries
        if isinstance(value, dict):
            result = {}
            for i, (k, v) in enumerate(list(value.items())[:20]):
                key_str = str(k)[:50]  # Limit key length
                result[key_str] = serialize_value(v, depth + 1, max_depth, seen.copy())
            return result

        # Sets
        if isinstance(value, (set, frozenset)):
            return list(serialize_value(list(value)[:20], depth + 1, max_depth, seen.copy()))

        # Type objects (classes themselves, not instances)
        if isinstance(value, type):
            return f"<class '{value.__name__}'>"

        # Functions and methods
        if callable(value) and not hasattr(value, "__dict__"):
            return f"<function {getattr(value, '__name__', 'anonymous')}>"

        # Class instances - serialize their __dict__
        if hasattr(value, "__dict__"):
            obj_dict = {}
            instance_dict = value.__dict__

            # Add class name hint
            class_name = type(value).__name__

            for attr_name, attr_value in list(instance_dict.items())[:15]:
                if attr_name.startswith("__"):
                    continue
                obj_dict[attr_name] = serialize_value(attr_value, depth + 1, max_depth, seen.copy())

            # If the object has common data structure attributes, include them
            # This helps with tree nodes, linked list nodes, etc.
            for special_attr in [
                "val",
                "value",
                "data",
                "key",
                "left",
                "right",
                "next",
                "prev",
                "children",
                "root",
                "head",
            ]:
                if hasattr(value, special_attr) and special_attr not in obj_dict:
                    attr_val = getattr(value, special_attr, None)
                    obj_dict[special_attr] = serialize_value(
                        attr_val, depth + 1, max_depth, seen.copy()
                    )

            return obj_dict

        # Fallback for other types
        return f"<{type(value).__name__}>"

    except Exception as e:
        return f"<error: {str(e)[:50]}>"
    finally:
        seen.discard(obj_id)


class SandboxedExecutor:
    def __init__(self, timeout: float = 1.5):
        self.timeout = timeout
        self.trace_steps: list[dict[str, Any]] = []
        self.step_counter = 0
        builtins_dict = __builtins__ if isinstance(__builtins__, dict) else __builtins__.__dict__
        self.original_import = builtins_dict["__import__"]

    def restricted_import(self, name, globals=None, locals=None, fromlist=(), level=0):
        if name in ALLOWED_MODULES:
            return self.original_import(name, globals, locals, fromlist, level)
        raise ImportError(f"Import of '{name}' is not allowed")

    def trace(self, frame, event, arg):
        if event == "line":
            self.step_counter += 1
            frame_locals = {}
            for key, value in frame.f_locals.items():
                if key == "__builtins__":
                    continue
                if key.startswith("__"):
                    continue

                try:
                    frame_locals[key] = serialize_value(value)
                except Exception:
                    frame_locals[key] = "<unserializable>"

            # Filter stack to only show frames from the executed code
            raw_stack = [f.function for f in inspect.stack()]
            try:
                # Find the index of 'trace' or 'exec' to cut off the framework stack
                # We want to show everything *above* the execution point
                # In inspect.stack(), index 0 is current frame, last index is module level
                # We'll capture just the relevant frames
                stack = []
                for frame_info in inspect.stack():
                    if frame_info.function == "trace":
                        continue
                    if frame_info.function == "execute" and "tracer.py" in frame_info.filename:
                        break
                    stack.append(frame_info.function)

                # Reverse to show from outer to inner (call stack style)
                stack.reverse()
            except Exception:
                # Fallback if filtering fails
                stack = [f.function for f in inspect.stack()[1:]][:5]

            self.trace_steps.append(
                {
                    "step": self.step_counter,
                    "line": frame.f_lineno,
                    "locals": frame_locals,
                    "stack": stack,
                }
            )

        return self.trace

    def execute(self, code: str, input_data: str | None = None):
        self.trace_steps = []
        self.step_counter = 0

        old_stdin = sys.stdin
        if input_data:
            sys.stdin = io.StringIO(input_data)

        builtins_dict = __builtins__ if isinstance(__builtins__, dict) else __builtins__.__dict__
        builtins_dict["__import__"] = self.restricted_import

        try:
            # signal.signal(signal.SIGALRM, timeout_handler)
            # signal.alarm(int(self.timeout))

            old_trace = sys.gettrace()
            sys.settrace(self.trace)

            namespace = {}
            exec(code, namespace)

            sys.settrace(old_trace)
            # signal.alarm(0)

        except TimeoutError:
            raise TimeoutError("Execution exceeded timeout")
        except Exception as e:
            raise e
        finally:
            sys.stdin = old_stdin
            builtins_dict["__import__"] = self.original_import
            # signal.alarm(0)

        return self.trace_steps


def trace_execution(code: str, input_data: str | None = None) -> list[dict[str, Any]]:
    executor = SandboxedExecutor(timeout=1.5)
    try:
        trace = executor.execute(code, input_data)
        if not trace:
            return [
                {
                    "step": 1,
                    "line": 0,
                    "locals": {},
                    "stack": [],
                }
            ]
        return trace
    except TimeoutError:
        return [
            {"step": 1, "line": 0, "locals": {}, "stack": [], "error": "Execution timeout exceeded"}
        ]
    except Exception as e:
        return [{"step": 1, "line": 0, "locals": {}, "stack": [], "error": str(e)}]
