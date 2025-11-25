import sys
import inspect
import io
import contextlib
from typing import List, Dict, Any, Optional
import signal
import resource

ALLOWED_MODULES = {"math", "random"}


class TimeoutError(Exception):
    pass


def timeout_handler(signum, frame):
    raise TimeoutError("Execution timeout")


class SandboxedExecutor:
    def __init__(self, timeout: float = 1.5):
        self.timeout = timeout
        self.trace_steps: List[Dict[str, Any]] = []
        self.step_counter = 0
        builtins_dict = __builtins__ if isinstance(__builtins__, dict) else __builtins__.__dict__
        self.original_import = builtins_dict['__import__']

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
                    
                try:
                    if isinstance(value, (int, float, str, bool, type(None))):
                        frame_locals[key] = value
                    elif isinstance(value, (list, tuple)):
                        # Convert to list and limit items
                        converted = []
                        for item in list(value)[:10]:
                            if isinstance(item, (int, float, str, bool, type(None))):
                                converted.append(item)
                            else:
                                converted.append(f"<{type(item).__name__}>")
                        frame_locals[key] = converted
                    elif isinstance(value, dict):
                        # Convert dict values
                        converted = {}
                        for k, v in list(value.items())[:10]:
                            if isinstance(v, (int, float, str, bool, type(None))):
                                converted[str(k)] = v
                            else:
                                converted[str(k)] = f"<{type(v).__name__}>"
                        frame_locals[key] = converted
                    elif isinstance(value, type):
                        # Handle type objects
                        frame_locals[key] = f"<type '{value.__name__}'>"
                    else:
                        frame_locals[key] = f"<{type(value).__name__}>"
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
                    if frame_info.function == 'trace':
                        continue
                    if frame_info.function == 'execute' and 'tracer.py' in frame_info.filename:
                        break
                    stack.append(frame_info.function)
                
                # Reverse to show from outer to inner (call stack style)
                stack.reverse()
            except Exception:
                # Fallback if filtering fails
                stack = [f.function for f in inspect.stack()[1:]][:5] 

            self.trace_steps.append({
                "step": self.step_counter,
                "line": frame.f_lineno,
                "locals": frame_locals,
                "stack": stack,
            })

        return self.trace

    def execute(self, code: str, input_data: Optional[str] = None):
        self.trace_steps = []
        self.step_counter = 0

        old_stdin = sys.stdin
        if input_data:
            sys.stdin = io.StringIO(input_data)

        builtins_dict = __builtins__ if isinstance(__builtins__, dict) else __builtins__.__dict__
        builtins_dict['__import__'] = self.restricted_import

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
            builtins_dict['__import__'] = self.original_import
            # signal.alarm(0)

        return self.trace_steps


def trace_execution(code: str, input_data: Optional[str] = None) -> List[Dict[str, Any]]:
    executor = SandboxedExecutor(timeout=1.5)
    try:
        trace = executor.execute(code, input_data)
        if not trace:
            return [{
                "step": 1,
                "line": 0,
                "locals": {},
                "stack": [],
            }]
        return trace
    except TimeoutError as e:
        return [{
            "step": 1,
            "line": 0,
            "locals": {},
            "stack": [],
            "error": "Execution timeout exceeded"
        }]
    except Exception as e:
        return [{
            "step": 1,
            "line": 0,
            "locals": {},
            "stack": [],
            "error": str(e)
        }]

